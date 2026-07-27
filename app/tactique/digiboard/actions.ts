"use server"

import { dbError } from "@/lib/db-error"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { logUsageForCurrentClub } from "@/lib/usage"
import { randomUUID } from "crypto"
import type { TacticalBoard } from "@/types/tactical"

const PionSchema = z.object({
  id:     z.string().max(8),
  team:   z.enum(["A", "B"]),
  number: z.number().int().min(1).max(99),
  x:      z.number().min(0).max(100),
  y:      z.number().min(0).max(100),
  label:  z.string().max(8),
})

const DrawingSchema = z.object({
  type:      z.enum(["fleche", "fleche-tirets", "fleche-courbe", "crayon", "zone", "texte"]),
  points:    z.array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })).min(1).max(500),
  color:     z.string().max(16),
  thickness: z.number().min(1).max(12),
  text:      z.string().max(120).optional(),
})

const SaveSchema = z.object({
  name:      z.string().trim().min(1, "Donne un nom au paperboard.").max(80),
  formation: z.string().max(20),
  pions:     z.array(PionSchema).max(30),
  drawings:  z.array(DrawingSchema).max(300),
  mode:      z.enum(["preparation", "direct", "analyse"]),
})

export async function saveTacticalBoard(
  raw: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Connecte-toi pour sauvegarder." }

  const parsed = SaveSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." }
  }

  const data = parsed.data
  const { data: row, error } = await supabase
    .from("tactical_boards")
    .insert({
      coach_id:  userId,
      name:      data.name,
      formation: data.formation,
      pions:     data.pions,
      drawings:  data.drawings,
      mode:      data.mode,
    })
    .select("id")
    .single()

  if (error || !row) return { ok: false, error: error?.message ?? "Erreur d'enregistrement." }
  await logUsageForCurrentClub("board_created", { board_id: row.id, mode: data.mode }) // [Backoffice — Phase 0]
  return { ok: true, id: row.id as string }
}

export async function updateTacticalBoard(
  id: string,
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Non connecté." }

  const parsed = SaveSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." }
  }

  const data = parsed.data
  const { error } = await supabase
    .from("tactical_boards")
    .update({
      name:      data.name,
      formation: data.formation,
      pions:     data.pions,
      drawings:  data.drawings,
      mode:      data.mode,
    })
    .eq("id", id)
    .eq("coach_id", userId)

  if (error) return dbError(error)
  return { ok: true }
}

export async function createShareLink(
  boardId: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Non connecté." }

  const token = randomUUID()
  const { error } = await supabase
    .from("tactical_boards")
    .update({ share_token: token })
    .eq("id", boardId)
    .eq("coach_id", userId)

  if (error) return { ok: false, error: "Erreur lors de la création du lien." }
  return { ok: true, token }
}

export async function getPublicBoard(token: string): Promise<TacticalBoard | null> {
  if (!token || token.length > 40) return null

  const { data, error } = await supabase
    .from("tactical_boards")
    .select("id, name, formation, pions, drawings, mode, created_at, coach_id")
    .eq("share_token", token)
    .single()

  if (error || !data) return null
  return {
    id:        data.id,
    coachId:   data.coach_id,
    name:      data.name,
    formation: data.formation ?? "",
    pions:     data.pions,
    drawings:  data.drawings,
    mode:      data.mode,
    createdAt: data.created_at,
  }
}

export async function getTacticalBoards(): Promise<TacticalBoard[]> {
  const { userId } = await auth()
  if (!userId) return []

  const { data, error } = await supabase
    .from("tactical_boards")
    .select("id, name, formation, pions, drawings, mode, created_at")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return data.map(row => ({
    id:        row.id,
    coachId:   userId,
    name:      row.name,
    formation: row.formation ?? "",
    pions:     row.pions,
    drawings:  row.drawings,
    mode:      row.mode,
    createdAt: row.created_at,
  }))
}
