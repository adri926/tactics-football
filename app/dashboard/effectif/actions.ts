"use server"

import { dbError } from "@/lib/db-error"
import { z } from "zod"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { logUsageForCurrentClub } from "@/lib/usage"
import { resend, hasEmailKey, FROM, playerInviteTemplate } from "@/lib/email"
import type { PhysicalEntry } from "@/types/physical"

export interface Player {
  id:             string
  owner_id:       string
  first_name:     string
  last_name:      string
  number:         number | null
  position:       "GK" | "DEF" | "MIL" | "ATT"
  status:         "available" | "injured" | "uncertain"
  injury_note:    string | null
  email:          string | null
  phone:          string | null
  user_id:        string | null
  invite_status:  "none" | "pending" | "accepted"
  goals:          number
  assists:        number
  matches_played: number
  minutes_played: number
  created_at:     string
}

const PlayerSchema = z.object({
  first_name:  z.string().min(1).max(50).trim(),
  last_name:   z.string().min(1).max(50).trim(),
  number:      z.coerce.number().int().min(1).max(99).nullable().optional(),
  position:    z.enum(["GK", "DEF", "MIL", "ATT"]),
  status:      z.enum(["available", "injured", "uncertain"]),
  injury_note: z.string().max(300).nullable().optional(),
  email:       z.string().email().max(200).nullable().optional(),
  phone:       z.string().max(20).nullable().optional(),
})

export async function getPlayerById(id: string): Promise<Player | null> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .eq(scope.column, scope.value)
    .single()
  if (error) return null
  return data
}

export async function getPlayers(): Promise<Player[]> {
  const scope = await getClubScope()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq(scope.column, scope.value)
    .order("position")
    .order("number", { nullsFirst: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createPlayer(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  const parsed = PlayerSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const { error } = await supabase
    .from("players")
    .insert({ ...parsed.data, owner_id: scope.userId, org_id: scope.orgId })

  if (error) return dbError(error)
  await logUsageForCurrentClub("player_added", { source: "manual" }) // [Backoffice — Phase 0]
  revalidatePath("/dashboard/effectif")
  return { ok: true }
}

export async function updatePlayer(
  id: string,
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "ID invalide." }

  const parsed = PlayerSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const { error } = await supabase
    .from("players")
    .update(parsed.data)
    .eq("id", id)
    .eq(scope.column, scope.value)  // impossible de modifier un joueur d'un autre club

  if (error) return dbError(error)
  revalidatePath("/dashboard/effectif")
  return { ok: true }
}

const ImportRowSchema = z.object({
  first_name: z.string().min(1).max(50).trim(),
  last_name:  z.string().min(1).max(50).trim(),
  number:     z.coerce.number().int().min(1).max(99).nullable().optional(),
})

const PositionSchema = z.enum(["GK", "DEF", "MIL", "ATT"])

// Import en masse depuis un fichier d'export FFF/Footclubs (CSV) — les
// joueurs sont créés avec le poste choisi par le coach et un statut par
// défaut "disponible" ; à affiner ensuite via l'édition individuelle.
export async function importPlayers(
  rawRows: unknown[],
  rawPosition: unknown
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const scope = await getClubScope()

  const position = PositionSchema.safeParse(rawPosition)
  if (!position.success) return { ok: false, error: "Poste invalide." }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { ok: false, error: "Aucune ligne à importer." }
  }
  if (rawRows.length > 60) {
    return { ok: false, error: "Trop de lignes (60 maximum par import)." }
  }

  const rows = rawRows.map(r => ImportRowSchema.safeParse(r))
  if (rows.some(r => !r.success)) {
    return { ok: false, error: "Certaines lignes sont invalides (nom/prénom manquant)." }
  }

  const toInsert = rows.map(r => ({
    ...(r as { success: true; data: z.infer<typeof ImportRowSchema> }).data,
    position:    position.data,
    status:      "available" as const,
    owner_id:    scope.userId,
    org_id:      scope.orgId,
  }))

  const { error } = await supabase.from("players").insert(toInsert)
  if (error) return dbError(error)

  await logUsageForCurrentClub("player_added", { source: "import", count: toInsert.length }) // [Backoffice — Phase 0]
  revalidatePath("/dashboard/effectif")
  return { ok: true, count: toInsert.length }
}

const PhysicalEntrySchema = z.object({
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  context:    z.enum(["match", "entrainement"]),
  distanceM:  z.coerce.number().int().min(0).max(20000).nullable().optional(),
  sprints:    z.coerce.number().int().min(0).max(200).nullable().optional(),
  vmaxKmh:    z.coerce.number().min(0).max(50).nullable().optional(),
  notes:      z.string().max(300).nullable().optional(),
})

export async function getPlayerPhysicalStats(playerId: string): Promise<PhysicalEntry[]> {
  const scope = await getClubScope()
  if (!/^[0-9a-f-]{36}$/.test(playerId)) return []

  const { data, error } = await supabase
    .from("player_physical_stats")
    .select("*")
    .eq(scope.column, scope.value)
    .eq("player_id", playerId)
    .order("date", { ascending: false })

  if (error) return []
  return (data ?? []).map(row => ({
    id:        row.id,
    playerId:  row.player_id,
    date:      row.date,
    context:   row.context,
    distanceM: row.distance_m,
    sprints:   row.sprints,
    vmaxKmh:   row.vmax_kmh,
    notes:     row.notes ?? "",
  }))
}

export async function addPhysicalEntry(
  playerId: string,
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!/^[0-9a-f-]{36}$/.test(playerId)) return { ok: false, error: "ID invalide." }

  const parsed = PhysicalEntrySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const { error } = await supabase.from("player_physical_stats").insert({
    owner_id:   scope.userId,
    org_id:     scope.orgId,
    player_id:  playerId,
    date:       parsed.data.date,
    context:    parsed.data.context,
    distance_m: parsed.data.distanceM ?? null,
    sprints:    parsed.data.sprints ?? null,
    vmax_kmh:   parsed.data.vmaxKmh ?? null,
    notes:      parsed.data.notes ?? null,
  })

  if (error) return dbError(error)
  revalidatePath(`/dashboard/effectif/${playerId}`)
  return { ok: true }
}

export async function deletePhysicalEntry(
  id: string,
  playerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "ID invalide." }

  const { error } = await supabase
    .from("player_physical_stats")
    .delete()
    .eq("id", id)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath(`/dashboard/effectif/${playerId}`)
  return { ok: true }
}

export async function invitePlayer(
  playerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!/^[0-9a-f-]{36}$/.test(playerId)) return { ok: false, error: "ID invalide." }

  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select("id, first_name, email, user_id")
    .eq("id", playerId)
    .eq(scope.column, scope.value)
    .single()

  if (playerErr || !player) return { ok: false, error: "Joueur introuvable." }
  if (!player.email) return { ok: false, error: "Le joueur n'a pas d'email renseigné." }
  if (player.user_id) return { ok: false, error: "Ce joueur a déjà un compte." }

  const { data: club } = await supabase
    .from("clubs")
    .select("name")
    .eq(scope.column, scope.value)
    .single()

  const token = randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Repart d'une invitation propre à chaque (ré)envoi. Filtre de scope direct (défense en
  // profondeur) même si `player` a déjà été vérifié comme appartenant au club plus haut.
  await supabase.from("player_invites").delete().eq("player_id", playerId).eq(scope.column, scope.value)

  const { error: insertErr } = await supabase.from("player_invites").insert({
    player_id: playerId,
    owner_id:  scope.userId,
    org_id:    scope.orgId,
    email:     player.email,
    token,
    expires_at: expiresAt,
  })
  if (insertErr) return dbError(insertErr)

  if (hasEmailKey()) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    const { subject, html } = playerInviteTemplate({
      clubName:        club?.name ?? "ton club",
      playerFirstName: player.first_name,
      inviteUrl:       `${baseUrl}/invitation/${token}`,
    })
    await resend!.emails.send({ from: FROM, to: player.email, subject, html })
  }

  await supabase.from("players").update({ invite_status: "pending" }).eq("id", playerId).eq(scope.column, scope.value)
  revalidatePath(`/dashboard/effectif/${playerId}`)
  return { ok: true }
}

export async function deletePlayer(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "ID invalide." }

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id)
    .eq(scope.column, scope.value)

  if (error) return dbError(error)
  revalidatePath("/dashboard/effectif")
  return { ok: true }
}
