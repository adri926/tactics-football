"use server"

import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { dbError } from "@/lib/db-error"
import { getClubScope } from "@/lib/scope"
import { logUsage } from "@/lib/usage"
import { checkTacticalAnalysisQuota } from "@/lib/rate-limit"
import { canonicalizeAttackDirection } from "@/lib/tactics/normalize-situation"
import { analyzeSituationWithClaude, embedDescription, hashPositions, parseEmbedding } from "@/lib/tactics/analyze-situation"

const PionSchema = z.object({
  id:     z.string().max(8),
  team:   z.enum(["A", "B"]),
  number: z.number().int().min(1).max(99),
  x:      z.number().min(0).max(100),
  y:      z.number().min(0).max(100),
  label:  z.string().max(8),
  dirX:   z.number().min(-1).max(1).optional(),
  dirY:   z.number().min(-1).max(1).optional(),
})

const AnalyzeSchema = z.object({
  pions:         z.array(PionSchema).max(30),
  ball:          z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  attackingTeam: z.enum(["A", "B"]),
  phaseOfPlay:   z.string().max(40).optional(),
})

const SearchSchema = z.object({
  query: z.string().trim().min(3, "Décris ce que tu cherches en quelques mots.").max(200),
})

export interface SimilarSituation {
  id: string
  title: string | null
  description: string | null
  tags: string[]
  phaseOfPlay: string | null
  similarity: number
}

export interface AnalyzeResult {
  id: string
  description: string
  tags: string[]
  principle: string
  cached: boolean
  similar: SimilarSituation[]
}

function mapMatchRows(rows: unknown[] | null): SimilarSituation[] {
  return (rows ?? []).map(r => {
    const row = r as Record<string, unknown>
    return {
      id: row.id as string,
      title: (row.title as string | null) ?? null,
      description: (row.ai_description as string | null) ?? null,
      tags: (row.ai_tags as string[] | null) ?? [],
      phaseOfPlay: (row.phase_of_play as string | null) ?? null,
      similarity: row.similarity as number,
    }
  })
}

// Analyse une situation via Claude (description/tags/principe) + embedding Gemini, avec cache par
// hash de positions normalisées — ne rappelle jamais l'IA pour une situation déjà analysée dans
// ce scope. Déclenchement explicite uniquement (bouton), jamais sur auto-save.
export async function analyzeTacticalSituation(
  raw: unknown
): Promise<{ ok: true; result: AnalyzeResult } | { ok: false; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Connecte-toi pour analyser une situation." }

  const parsed = AnalyzeSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." }
  }
  const data = parsed.data
  const scope = await getClubScope()

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq(scope.column, scope.value)
    .maybeSingle()
  const clubId = (club?.id as string | undefined) ?? null

  const normalized = canonicalizeAttackDirection(data.pions, data.ball, data.attackingTeam)
  const hash = hashPositions(normalized.pions, normalized.ball)

  const { data: cachedRow } = await supabase
    .from("tactical_situations")
    .select("id, ai_description, ai_tags, ai_principle, embedding")
    .eq("positions_hash", hash)
    .eq(scope.column, scope.value)
    .maybeSingle()

  let situationId: string
  let description: string
  let tags: string[]
  let principle: string
  let embedding: number[] | null

  if (cachedRow) {
    situationId = cachedRow.id as string
    description = cachedRow.ai_description as string
    tags = (cachedRow.ai_tags as string[]) ?? []
    principle = (cachedRow.ai_principle as string) ?? ""
    embedding = parseEmbedding(cachedRow.embedding)
  } else {
    if (clubId) {
      const quota = await checkTacticalAnalysisQuota(scope, clubId)
      if (!quota.ok) {
        await logUsage({ clubId, userId: scope.userId, eventType: "tactical_analysis_blocked", metadata: { reason: "quota", ...quota } })
        return { ok: false, error: quota.error }
      }
    }

    let analysis
    try {
      analysis = await analyzeSituationWithClaude({
        pions: normalized.pions, ball: normalized.ball, phaseOfPlay: data.phaseOfPlay,
      })
    } catch {
      await logUsage({ clubId, userId: scope.userId, eventType: "tactical_analysis_blocked", metadata: { reason: "claude_error" } })
      return { ok: false, error: "L'analyse IA est momentanément indisponible. Réessaie plus tard." }
    }

    try {
      embedding = await embedDescription(analysis.description)
    } catch {
      await logUsage({ clubId, userId: scope.userId, eventType: "tactical_analysis_blocked", metadata: { reason: "embedding_error" } })
      return { ok: false, error: "L'analyse IA est momentanément indisponible. Réessaie plus tard." }
    }

    const { data: row, error } = await supabase
      .from("tactical_situations")
      .insert({
        owner_id:       scope.userId,
        org_id:         scope.orgId,
        club_id:        clubId,
        raw_positions:  { pions: normalized.pions, ball: normalized.ball },
        phase_of_play:  data.phaseOfPlay ?? null,
        ai_description: analysis.description,
        ai_tags:        analysis.tags,
        ai_principle:   analysis.principle,
        embedding,
        positions_hash: hash,
      })
      .select("id")
      .single()

    if (error || !row) return dbError(error)

    situationId = row.id as string
    description = analysis.description
    tags = analysis.tags
    principle = analysis.principle

    await logUsage({ clubId, userId: scope.userId, eventType: "tactical_analysis", metadata: { situation_id: situationId } })
  }

  let similar: SimilarSituation[] = []
  if (embedding) {
    const { data: matches } = await supabase.rpc("match_tactical_situations", {
      query_embedding: embedding,
      match_owner_id:  scope.userId,
      match_org_id:    scope.orgId,
      match_count:     3,
      exclude_id:      situationId,
    })
    similar = mapMatchRows(matches)
  }

  return { ok: true, result: { id: situationId, description, tags, principle, cached: !!cachedRow, similar } }
}

// Recherche sémantique en langage naturel dans la bibliothèque de situations (curatées + celles
// du club courant).
export async function searchTacticalSituations(
  raw: unknown
): Promise<{ ok: true; results: SimilarSituation[] } | { ok: false; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Connecte-toi pour rechercher." }

  const parsed = SearchSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Requête invalide." }
  }

  const scope = await getClubScope()

  let embedding: number[]
  try {
    embedding = await embedDescription(parsed.data.query)
  } catch {
    return { ok: false, error: "La recherche est momentanément indisponible. Réessaie plus tard." }
  }

  const { data: matches, error } = await supabase.rpc("match_tactical_situations", {
    query_embedding: embedding,
    match_owner_id:  scope.userId,
    match_org_id:    scope.orgId,
    match_count:     8,
  })
  if (error) return dbError(error)

  return { ok: true, results: mapMatchRows(matches) }
}
