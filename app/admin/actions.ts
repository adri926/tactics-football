"use server"

// [Backoffice — Phase 0] Actions admin. Toutes derrière requireAdmin() et TOUTES précédées d'un
// logAdminAction() AVANT la mutation (journal d'audit = source de vérité de ce que l'owner a fait).
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import { requireAdmin, logAdminAction } from "@/lib/admin"
import type { PlanFeature } from "@/lib/plan"

const uuid = z.string().regex(/^[0-9a-f-]{36}$/, "ID invalide")

type Result = { ok: true } | { ok: false; error: string }

function revalidateAdmin() {
  revalidatePath("/admin")
  revalidatePath("/admin/a-contacter")
  revalidatePath("/admin/acquisition")
}

// Ajoute une note interne sur un compte.
export async function addNote(clubId: string, body: string): Promise<Result> {
  const actor = await requireAdmin()
  const parsed = z.object({ clubId: uuid, body: z.string().trim().min(1).max(2000) }).safeParse({ clubId, body })
  if (!parsed.success) return { ok: false, error: "Note invalide." }

  await logAdminAction({ actor, actionType: "add_note", targetType: "club", targetId: parsed.data.clubId, payload: { body: parsed.data.body } })
  const { error } = await supabase.from("account_notes").insert({ club_id: parsed.data.clubId, author: actor, body: parsed.data.body })
  if (error) return { ok: false, error: error.message }

  revalidateAdmin()
  return { ok: true }
}

// Marque un compte « à recontacter » (le fait remonter dans la liste d'action).
export async function markRemind(clubId: string, body = "À recontacter"): Promise<Result> {
  const actor = await requireAdmin()
  const parsed = z.object({ clubId: uuid, body: z.string().trim().min(1).max(2000) }).safeParse({ clubId, body })
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  await logAdminAction({ actor, actionType: "mark_remind", targetType: "club", targetId: parsed.data.clubId, payload: { body: parsed.data.body } })
  const { error } = await supabase.from("account_notes").insert({ club_id: parsed.data.clubId, author: actor, body: parsed.data.body, remind: true })
  if (error) return { ok: false, error: error.message }

  revalidateAdmin()
  return { ok: true }
}

// Résilie un abonnement — RAISON OBLIGATOIRE. Écrit un subscription_events(type=churn).
export async function cancelSubscription(clubId: string, reason: string): Promise<Result> {
  const actor = await requireAdmin()
  const parsed = z.object({ clubId: uuid, reason: z.string().trim().min(3, "Raison obligatoire").max(500) }).safeParse({ clubId, reason })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan, status, mrr_amount")
    .eq("club_id", parsed.data.clubId)
    .maybeSingle()
  if (!sub) return { ok: false, error: "Aucun abonnement pour ce compte." }
  if (sub.status === "canceled") return { ok: false, error: "Cet abonnement est déjà résilié." }

  await logAdminAction({
    actor, actionType: "cancel_subscription", targetType: "subscription", targetId: sub.id as string,
    payload: { club_id: parsed.data.clubId, reason: parsed.data.reason, before: { plan: sub.plan, status: sub.status, mrr: sub.mrr_amount }, after: { plan: "amateur", status: "canceled", mrr: 0 } },
  })

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from("subscriptions")
    .update({ plan: "amateur", status: "canceled", canceled_at: now, cancellation_reason: parsed.data.reason, mrr_amount: 0 })
    .eq("id", sub.id)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from("subscription_events").insert({ subscription_id: sub.id, type: "churn", mrr_delta: -Number(sub.mrr_amount ?? 0) })

  revalidateAdmin()
  return { ok: true }
}

// Débloque une frontière pour un compte (override > plan). max_value null = illimité, 1 = activé.
const FEATURES: PlanFeature[] = ["video_analysis_minutes", "extra_team", "season_archive", "cotisations", "medical", "multi_admin", "pdf_export", "session_template"]

export async function unblockFeature(clubId: string, feature: string, maxValue: number | null, reason: string): Promise<Result> {
  const actor = await requireAdmin()
  const parsed = z.object({
    clubId: uuid,
    feature: z.enum(FEATURES as [PlanFeature, ...PlanFeature[]]),
    maxValue: z.number().nonnegative().nullable(),
    reason: z.string().trim().max(500),
  }).safeParse({ clubId, feature, maxValue, reason })
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  await logAdminAction({ actor, actionType: "unblock_feature", targetType: "club", targetId: parsed.data.clubId, payload: { feature: parsed.data.feature, max_value: parsed.data.maxValue, reason: parsed.data.reason } })
  const { error } = await supabase.from("account_overrides").insert({
    club_id: parsed.data.clubId, feature: parsed.data.feature, max_value: parsed.data.maxValue, reason: parsed.data.reason || null, created_by: actor,
  })
  if (error) return { ok: false, error: error.message }

  revalidateAdmin()
  return { ok: true }
}

// Crédite des minutes d'IA vidéo à un compte (override sur video_analysis_minutes, reset weekly hérité du plan).
export async function creditVideoMinutes(clubId: string, minutes: number, reason: string): Promise<Result> {
  const actor = await requireAdmin()
  const parsed = z.object({ clubId: uuid, minutes: z.number().int().positive().max(100000), reason: z.string().trim().max(500) }).safeParse({ clubId, minutes, reason })
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  await logAdminAction({ actor, actionType: "credit_video_minutes", targetType: "club", targetId: parsed.data.clubId, payload: { minutes: parsed.data.minutes, reason: parsed.data.reason } })
  const { error } = await supabase.from("account_overrides").insert({
    club_id: parsed.data.clubId, feature: "video_analysis_minutes", max_value: parsed.data.minutes, reason: parsed.data.reason || `Crédit de ${parsed.data.minutes} min IA`, created_by: actor,
  })
  if (error) return { ok: false, error: error.message }

  revalidateAdmin()
  return { ok: true }
}
