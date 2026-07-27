"use server"

import { dbError } from "@/lib/db-error"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { getActiveTeam } from "@/lib/teams"
import { logUsageForCurrentClub } from "@/lib/usage"

// [Backoffice — Phase 0] Feuille de match imprimée. Aujourd'hui = window.print() (pas de vrai
// export généré) → on logge l'usage `pdf_export`, mais le quota n'est PAS encore enforçable
// tant qu'il n'existe pas d'export réel (cf. BACKOFFICE.md, périmètre différé).
export async function logPrint(matchId?: string): Promise<void> {
  await logUsageForCurrentClub("pdf_export", { source: "match_preparation", match_id: matchId ?? null })
}

export interface Match {
  id:           string
  owner_id:     string
  opponent:     string
  date:         string
  home_away:    "home" | "away"
  competition:  string | null
  venue:        string | null
  goals_for:    number | null
  goals_against: number | null
  opponent_logo: string | null
  notes:        string | null
  created_at:   string
}

export interface Lineup {
  starters:    string[]
  substitutes: string[]
}

export interface MatchPlayerStat {
  playerId:      string
  goals:         number
  assists:       number
  yellowCards:   number
  redCards:      number
  minutesPlayed: number
}

export interface PlayerSeasonStats {
  matchesPlayed: number
  starts:        number
  goals:         number
  assists:       number
  minutesPlayed: number
}

const MatchStatRowSchema = z.object({
  playerId:      z.string().regex(/^[0-9a-f-]{36}$/),
  goals:         z.coerce.number().int().min(0).max(20),
  assists:       z.coerce.number().int().min(0).max(20),
  yellowCards:   z.coerce.number().int().min(0).max(2),
  redCards:      z.coerce.number().int().min(0).max(1),
  minutesPlayed: z.coerce.number().int().min(0).max(120),
})

const MatchSchema = z.object({
  opponent:     z.string().min(1).max(100).trim(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  home_away:    z.enum(["home", "away"]),
  competition:  z.string().max(100).nullable().optional(),
  venue:        z.string().max(200).nullable().optional(),
  goals_for:    z.coerce.number().int().min(0).max(30).nullable().optional(),
  goals_against: z.coerce.number().int().min(0).max(30).nullable().optional(),
  opponent_logo: z.string().max(2000).trim().nullable().optional(),
  notes:        z.string().max(1000).nullable().optional(),
})

export async function getMatchById(id: string): Promise<Match | null> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .eq(scope.column, scope.value)
    .single()
  if (error) return null
  return data
}

export async function getLineup(matchId: string): Promise<Lineup> {
  const scope = await getClubScope()
  const { data } = await supabase
    .from("match_lineups")
    .select("player_id, role")
    .eq("match_id", matchId)
    .eq(scope.column, scope.value)
  if (!data) return { starters: [], substitutes: [] }
  return {
    starters:    data.filter(r => r.role === "starter").map(r => r.player_id),
    substitutes: data.filter(r => r.role === "substitute").map(r => r.player_id),
  }
}

export async function saveLineup(
  matchId: string,
  starters: string[],
  substitutes: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(matchId)) return { ok: false, error: "ID invalide." }

  const validId = (id: string) => /^[0-9a-f-]{36}$/.test(id)

  await supabase.from("match_lineups").delete().eq("match_id", matchId).eq(scope.column, scope.value)

  const rows = [
    ...starters.filter(validId).map(id => ({ match_id: matchId, player_id: id, role: "starter",    owner_id: scope.userId, org_id: scope.orgId })),
    ...substitutes.filter(validId).map(id => ({ match_id: matchId, player_id: id, role: "substitute", owner_id: scope.userId, org_id: scope.orgId })),
  ]

  if (rows.length === 0) return { ok: true }

  const { error } = await supabase.from("match_lineups").insert(rows)
  if (error) return dbError(error)

  revalidatePath(`/dashboard/matchs/${matchId}/preparation`)
  return { ok: true }
}

export async function getMatches(): Promise<Match[]> {
  const scope = await getClubScope()
  const activeTeam = await getActiveTeam(scope)
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq(scope.column, scope.value)
    .eq("team_id", activeTeam.id)
    .order("date", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createMatch(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  const parsed = MatchSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const team = await getActiveTeam(scope)

  const { error } = await supabase
    .from("matches")
    .insert({ ...parsed.data, owner_id: scope.userId, org_id: scope.orgId, team_id: team.id })

  if (error) return dbError(error)
  revalidatePath("/dashboard/matchs")
  return { ok: true }
}

export async function updateMatch(
  id: string,
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "ID invalide." }

  const parsed = MatchSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const { error } = await supabase
    .from("matches")
    .update(parsed.data)
    .eq("id", id)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath("/dashboard/matchs")
  return { ok: true }
}

export async function getMatchStats(matchId: string): Promise<MatchPlayerStat[]> {
  const match = await getMatchById(matchId)
  if (!match) return []

  const { data } = await supabase
    .from("match_stats")
    .select("player_id, goals, assists, yellow_cards, red_cards, minutes_played")
    .eq("match_id", matchId)

  if (!data) return []
  return data.map(row => ({
    playerId:      row.player_id,
    goals:         row.goals ?? 0,
    assists:       row.assists ?? 0,
    yellowCards:   row.yellow_cards ?? 0,
    redCards:      row.red_cards ?? 0,
    minutesPlayed: row.minutes_played ?? 0,
  }))
}

export async function saveMatchStats(
  matchId: string,
  rows: unknown[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f-]{36}$/.test(matchId)) return { ok: false, error: "ID invalide." }

  const match = await getMatchById(matchId)
  if (!match) return { ok: false, error: "Match introuvable." }

  const parsed = z.array(MatchStatRowSchema).safeParse(rows)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  // match_stats n'a pas de colonne de scope : l'appartenance au club est garantie en amont
  // par getMatchById() (scopé) qui renvoie null pour un match d'un autre club → on ne
  // supprime jamais les stats d'un match qu'on ne possède pas.
  await supabase.from("match_stats").delete().eq("match_id", matchId)

  const toInsert = parsed.data
    .filter(r => r.goals || r.assists || r.yellowCards || r.redCards || r.minutesPlayed)
    .map(r => ({
      match_id:       matchId,
      player_id:      r.playerId,
      goals:          r.goals,
      assists:        r.assists,
      yellow_cards:   r.yellowCards,
      red_cards:      r.redCards,
      minutes_played: r.minutesPlayed,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabase.from("match_stats").insert(toInsert)
    if (error) return dbError(error)
  }

  revalidatePath(`/dashboard/matchs/${matchId}/bilan`)
  revalidatePath("/dashboard/matchs")
  revalidatePath("/dashboard/data")
  revalidatePath("/dashboard/data/joueurs")
  return { ok: true }
}

export async function getPlayerSeasonStats(): Promise<Record<string, PlayerSeasonStats>> {
  const scope = await getClubScope()

  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq(scope.column, scope.value)
  const matchIds = (matches ?? []).map(m => m.id)
  if (matchIds.length === 0) return {}

  const [{ data: lineups }, { data: stats }] = await Promise.all([
    supabase.from("match_lineups").select("player_id, role").eq(scope.column, scope.value).in("match_id", matchIds),
    supabase.from("match_stats").select("player_id, goals, assists, minutes_played").in("match_id", matchIds),
  ])

  const result: Record<string, PlayerSeasonStats> = {}
  const get = (playerId: string) => {
    if (!result[playerId]) {
      result[playerId] = { matchesPlayed: 0, starts: 0, goals: 0, assists: 0, minutesPlayed: 0 }
    }
    return result[playerId]
  }

  for (const row of lineups ?? []) {
    const entry = get(row.player_id)
    entry.matchesPlayed += 1
    if (row.role === "starter") entry.starts += 1
  }

  for (const row of stats ?? []) {
    const entry = get(row.player_id)
    entry.goals += row.goals ?? 0
    entry.assists += row.assists ?? 0
    entry.minutesPlayed += row.minutes_played ?? 0
  }

  return result
}

export interface PlayerMatchEntry {
  match:         Match
  role:          "starter" | "substitute"
  goals:         number
  assists:       number
  yellowCards:   number
  redCards:      number
  minutesPlayed: number
}

export async function getPlayerMatchHistory(playerId: string): Promise<PlayerMatchEntry[]> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(playerId)) return []

  const { data: lineupRows } = await supabase
    .from("match_lineups")
    .select("match_id, role")
    .eq(scope.column, scope.value)
    .eq("player_id", playerId)

  if (!lineupRows || lineupRows.length === 0) return []
  const matchIds = lineupRows.map(r => r.match_id)

  const [{ data: matches }, { data: stats }] = await Promise.all([
    supabase.from("matches").select("*").eq(scope.column, scope.value).in("id", matchIds).order("date", { ascending: false }),
    supabase.from("match_stats").select("match_id, goals, assists, yellow_cards, red_cards, minutes_played").eq("player_id", playerId).in("match_id", matchIds),
  ])
  if (!matches) return []

  return matches.map(match => {
    const lineupRow = lineupRows.find(r => r.match_id === match.id)
    const statRow = stats?.find(s => s.match_id === match.id)
    return {
      match,
      role:          lineupRow?.role === "starter" ? "starter" : "substitute",
      goals:         statRow?.goals ?? 0,
      assists:       statRow?.assists ?? 0,
      yellowCards:   statRow?.yellow_cards ?? 0,
      redCards:      statRow?.red_cards ?? 0,
      minutesPlayed: statRow?.minutes_played ?? 0,
    }
  })
}

export async function deleteMatch(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "ID invalide." }

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", id)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath("/dashboard/matchs")
  return { ok: true }
}
