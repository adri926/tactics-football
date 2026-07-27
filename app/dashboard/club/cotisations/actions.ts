"use server"

import { dbError } from "@/lib/db-error"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { logUsage } from "@/lib/usage"
import { getEffectiveLimit } from "@/lib/plan"
import { requireFeesAccess, getMyClub } from "@/app/dashboard/club/actions"
import { CURRENT_SEASON } from "./constants"

// [Backoffice — Phase 0] Gate freemium : la gestion des cotisations est une feature Pro.
// En plus du contrôle de rôle (requireFeesAccess), on vérifie le plan sur les écritures.
async function requireCotisationsPlan(): Promise<{ ok: true; clubId: string } | { ok: false; error: string }> {
  const club = await getMyClub()
  if (!club) return { ok: false, error: "Club introuvable." }
  const { maxValue } = await getEffectiveLimit(club.id, "cotisations")
  if (maxValue === 0) {
    await logUsage({ clubId: club.id, eventType: "cotisations_blocked" })
    return { ok: false, error: "La gestion des cotisations est réservée à Footboard Pro." }
  }
  return { ok: true, clubId: club.id }
}

// Null-safe : Resend throw sans clé → ne pas instancier au chargement (casserait `next build`).
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.RESEND_FROM ?? "Footboard <onboarding@resend.dev>"

export type FeeStatus = "paid" | "partial" | "unpaid" | "none"

export interface PlayerFee {
  playerId:   string
  firstName:  string
  lastName:   string
  number:     number | null
  email:      string | null
  amountDue:  number
  amountPaid: number
  status:     FeeStatus
}

export interface FeesData {
  season:     string
  players:    PlayerFee[]
  totalDue:   number
  totalPaid:  number
}

function feeStatus(due: number, paid: number): FeeStatus {
  if (due <= 0) return "none"
  if (paid >= due) return "paid"
  if (paid > 0) return "partial"
  return "unpaid"
}

export async function getFees(): Promise<FeesData> {
  await requireFeesAccess()
  const scope = await getClubScope()

  const [{ data: players, error: playersErr }, { data: fees, error: feesErr }] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name, number, email")
      .eq(scope.column, scope.value)
      .order("position")
      .order("number", { nullsFirst: false }),
    supabase
      .from("player_fees")
      .select("player_id, amount_due, amount_paid")
      .eq(scope.column, scope.value)
      .eq("season", CURRENT_SEASON),
  ])

  if (playersErr) throw new Error(playersErr.message)
  if (feesErr) throw new Error(feesErr.message)

  const feeByPlayer = new Map((fees ?? []).map(f => [f.player_id, f]))

  const result: PlayerFee[] = (players ?? []).map(p => {
    const fee = feeByPlayer.get(p.id)
    const amountDue  = Number(fee?.amount_due ?? 0)
    const amountPaid = Number(fee?.amount_paid ?? 0)
    return {
      playerId:  p.id,
      firstName: p.first_name,
      lastName:  p.last_name,
      number:    p.number,
      email:     p.email,
      amountDue,
      amountPaid,
      status:    feeStatus(amountDue, amountPaid),
    }
  })

  return {
    season:    CURRENT_SEASON,
    players:   result,
    totalDue:  result.reduce((s, p) => s + p.amountDue, 0),
    totalPaid: result.reduce((s, p) => s + p.amountPaid, 0),
  }
}

const FeeSchema = z.object({
  playerId:   z.string().regex(/^[0-9a-f-]{36}$/),
  amountDue:  z.coerce.number().min(0).max(100000),
  amountPaid: z.coerce.number().min(0).max(100000),
})

export async function setFee(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireFeesAccess()
  const gate = await requireCotisationsPlan()
  if (!gate.ok) return gate
  const scope = await getClubScope()

  const parsed = FeeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const { playerId, amountDue, amountPaid } = parsed.data

  const { error } = await supabase
    .from("player_fees")
    .upsert({
      player_id:   playerId,
      season:      CURRENT_SEASON,
      amount_due:  amountDue,
      amount_paid: amountPaid,
      paid_at:     amountPaid > 0 ? new Date().toISOString().slice(0, 10) : null,
      owner_id:    scope.userId,
      org_id:      scope.orgId,
    }, { onConflict: "player_id,season" })

  if (error) return dbError(error)
  await logUsage({ clubId: gate.clubId, userId: scope.userId, eventType: "fee_updated", metadata: { scope: "single", amount_due: amountDue } }) // [Backoffice — Phase 0]
  revalidatePath("/dashboard/club/cotisations")
  return { ok: true }
}

function reminderEmailHtml({
  clubName, firstName, amountDue, amountPaid,
}: { clubName: string; firstName: string; amountDue: number; amountPaid: number }) {
  const remaining = (amountDue - amountPaid).toFixed(2)
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0ec;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#181812;padding:24px 28px;">
      <p style="margin:0;color:#7A9A82;font-size:10px;letter-spacing:0.12em;font-weight:700;">FOOTBOARD</p>
      <h1 style="margin:10px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:0.02em;">Rappel de cotisation</h1>
    </div>
    <div style="padding:28px 28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#222;">Bonjour ${firstName},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
        ${clubName} te rappelle que ta cotisation pour la saison ${CURRENT_SEASON} n'est pas encore réglée intégralement.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#444;">Montant restant à payer : <strong>${remaining} €</strong></p>
      <p style="margin:24px 0 0;font-size:13px;color:#888;">Merci de régulariser auprès de ton club.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendFeeReminder(
  playerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireFeesAccess()
  const scope = await getClubScope()
  const club  = await getMyClub()
  if (!club) return { ok: false, error: "Club introuvable." }

  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select("first_name, email")
    .eq("id", playerId)
    .eq(scope.column, scope.value)
    .single()

  if (playerErr || !player) return { ok: false, error: "Joueur introuvable." }
  if (!player.email) return { ok: false, error: "Ce joueur n'a pas d'adresse email." }

  const { data: fee } = await supabase
    .from("player_fees")
    .select("amount_due, amount_paid")
    .eq("player_id", playerId)
    .eq("season", CURRENT_SEASON)
    .single()

  const amountDue  = Number(fee?.amount_due ?? 0)
  const amountPaid = Number(fee?.amount_paid ?? 0)
  if (amountDue <= amountPaid) return { ok: false, error: "Cette cotisation est déjà réglée." }
  if (!resend) return { ok: false, error: "Envoi d'email non configuré (clé Resend manquante)." }

  try {
    await resend.emails.send({
      from:    FROM,
      to:      player.email,
      subject: `[${club.name}] Rappel — cotisation ${CURRENT_SEASON}`,
      html:    reminderEmailHtml({ clubName: club.name, firstName: player.first_name, amountDue, amountPaid }),
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'envoi." }
  }

  return { ok: true }
}

const DefaultFeeSchema = z.object({
  amountDue: z.coerce.number().min(0).max(100000),
})

export async function applyFeeToAll(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireFeesAccess()
  const gate = await requireCotisationsPlan()
  if (!gate.ok) return gate
  const scope = await getClubScope()

  const parsed = DefaultFeeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const [{ data: players, error: playersErr }, { data: fees, error: feesErr }] = await Promise.all([
    supabase
      .from("players")
      .select("id")
      .eq(scope.column, scope.value),
    supabase
      .from("player_fees")
      .select("player_id, amount_paid, paid_at")
      .eq(scope.column, scope.value)
      .eq("season", CURRENT_SEASON),
  ])

  if (playersErr) return dbError(playersErr)
  if (feesErr) return dbError(feesErr)
  if (!players || players.length === 0) return { ok: false, error: "Aucun joueur dans l'effectif." }

  const feeByPlayer = new Map((fees ?? []).map(f => [f.player_id, f]))

  const rows = players.map(p => {
    const existing = feeByPlayer.get(p.id)
    return {
      player_id:   p.id,
      season:      CURRENT_SEASON,
      amount_due:  parsed.data.amountDue,
      amount_paid: existing?.amount_paid ?? 0,
      paid_at:     existing?.paid_at ?? null,
      owner_id:    scope.userId,
      org_id:      scope.orgId,
    }
  })

  const { error } = await supabase
    .from("player_fees")
    .upsert(rows, { onConflict: "player_id,season" })

  if (error) return dbError(error)
  await logUsage({ clubId: gate.clubId, userId: scope.userId, eventType: "fee_updated", metadata: { scope: "all", amount_due: parsed.data.amountDue, players: rows.length } }) // [Backoffice — Phase 0]
  revalidatePath("/dashboard/club/cotisations")
  return { ok: true }
}
