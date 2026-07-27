"use server"

import { dbError } from "@/lib/db-error"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { getClubTeams, ACTIVE_TEAM_COOKIE } from "@/lib/teams"
import { getMyClub } from "@/app/dashboard/club/actions"
import { getEffectiveLimit } from "@/lib/plan"
import { logUsage } from "@/lib/usage"

export interface TeamWithPlayers {
  id:        string
  name:      string
  playerIds: string[]
}

export interface TeamPlayer {
  id:         string
  first_name: string
  last_name:  string
  number:     number | null
  position:   "GK" | "DEF" | "MIL" | "ATT"
}

export interface TeamsManagementData {
  teams:   TeamWithPlayers[]
  players: TeamPlayer[]
}

const NameSchema = z.string().trim().min(1).max(50)

export async function getTeamsManagementData(): Promise<TeamsManagementData> {
  const scope = await getClubScope()

  const [teams, { data: players }] = await Promise.all([
    getClubTeams(scope),
    supabase
      .from("players")
      .select("id, first_name, last_name, number, position")
      .eq(scope.column, scope.value)
      .order("position")
      .order("number", { nullsFirst: false }),
  ])

  const teamIds = teams.map(t => t.id)
  const { data: teamPlayers } = teamIds.length > 0
    ? await supabase.from("team_players").select("team_id, player_id").in("team_id", teamIds)
    : { data: [] as { team_id: string; player_id: string }[] }

  return {
    teams: teams.map(t => ({
      ...t,
      playerIds: (teamPlayers ?? []).filter(tp => tp.team_id === t.id).map(tp => tp.player_id),
    })),
    players: players ?? [],
  }
}

export async function createTeam(
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  const parsed = NameSchema.safeParse(name)
  if (!parsed.success) return { ok: false, error: "Nom invalide." }

  // [Backoffice — Phase 0] Enforcement freemium : plafond de groupes/équipes selon le plan.
  // extra_team = équipes AU-DELÀ de la première ; max total = extra_team + 1 (null = illimité).
  const club = await getMyClub()
  if (club) {
    const { maxValue } = await getEffectiveLimit(club.id, "extra_team")
    if (maxValue !== null) {
      const existing = await getClubTeams(scope)
      if (existing.length >= maxValue + 1) {
        await logUsage({ clubId: club.id, userId: scope.userId, eventType: "second_team_blocked", metadata: { current_teams: existing.length, limit: maxValue + 1 } })
        return { ok: false, error: "Ton plan ne permet qu'une seule équipe. Passe à un plan supérieur pour gérer plusieurs groupes." }
      }
    }
  }

  const { error } = await supabase
    .from("teams")
    .insert({ owner_id: scope.userId, org_id: scope.orgId, name: parsed.data })

  if (error) return dbError(error)
  revalidatePath("/dashboard/effectif/equipes")
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}

export async function renameTeam(
  teamId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(teamId)) return { ok: false, error: "ID invalide." }

  const parsed = NameSchema.safeParse(name)
  if (!parsed.success) return { ok: false, error: "Nom invalide." }

  const { error } = await supabase
    .from("teams")
    .update({ name: parsed.data })
    .eq("id", teamId)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath("/dashboard/effectif/equipes")
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}

export async function deleteTeam(
  teamId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(teamId)) return { ok: false, error: "ID invalide." }

  const teams = await getClubTeams(scope)
  if (teams.length <= 1) return { ok: false, error: "Le club doit garder au moins une équipe." }
  if (!teams.some(t => t.id === teamId)) return { ok: false, error: "Équipe introuvable." }

  const [{ count: matchCount }, { count: trainingCount }] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabase.from("trainings").select("id", { count: "exact", head: true }).eq("team_id", teamId),
  ])
  if ((matchCount ?? 0) > 0 || (trainingCount ?? 0) > 0) {
    return { ok: false, error: "Réaffecte les matchs/entraînements de cette équipe avant de la supprimer." }
  }

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath("/dashboard/effectif/equipes")
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}

export async function setTeamPlayer(
  teamId: string,
  playerId: string,
  assigned: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(teamId) || !/^[0-9a-f-]{36}$/.test(playerId)) {
    return { ok: false, error: "ID invalide." }
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq(scope.column, scope.value)
    .single()
  if (!team) return { ok: false, error: "Équipe introuvable." }

  if (assigned) {
    const { error } = await supabase
      .from("team_players")
      .upsert({ team_id: teamId, player_id: playerId }, { onConflict: "team_id,player_id" })
    if (error) return dbError(error)
  } else {
    const { error } = await supabase
      .from("team_players")
      .delete()
      .eq("team_id", teamId)
      .eq("player_id", playerId)
    if (error) return dbError(error)
  }

  revalidatePath("/dashboard/effectif/equipes")
  return { ok: true }
}

export async function setActiveTeam(teamId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(teamId)) return { ok: false, error: "ID invalide." }

  const teams = await getClubTeams(scope)
  if (!teams.some(t => t.id === teamId)) return { ok: false, error: "Équipe introuvable." }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, { path: "/", maxAge: 60 * 60 * 24 * 365 })
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}
