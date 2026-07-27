// [Backoffice — Phase 0] Requêtes de lecture du backoffice (service-role, cross-clubs, aucun scope).
// Données réelles uniquement : à 0 client / 0 event, tout renvoie des séries vides → états vides UI.
import { supabase } from "@/lib/supabase"

const DAY = 24 * 60 * 60 * 1000
const BLOCKED_EVENTS = ["video_analysis_blocked", "second_team_blocked", "cotisations_blocked", "pdf_export_blocked", "template_blocked", "archive_blocked"]
// Events qui prouvent un usage réel du produit (pour l'activation).
const ACTIVATION_EVENTS = ["board_created", "session_created", "player_added", "fee_updated", "video_analysis"]

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString()
}

async function clubNameMap(clubIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(clubIds.filter(Boolean))]
  if (ids.length === 0) return new Map()
  const { data } = await supabase.from("clubs").select("id, name").in("id", ids)
  return new Map((data ?? []).map(c => [c.id as string, c.name as string]))
}

export interface OverviewMetrics {
  mrr: number
  arr: number
  payingCount: number
  activeTrialing: number
  churn30d: number
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan, status, mrr_amount, canceled_at")

  const rows = subs ?? []
  const active = rows.filter(s => s.status === "active" || s.status === "trialing")
  const paying = active.filter(s => s.plan !== "amateur")
  const mrr = paying.reduce((sum, s) => sum + Number(s.mrr_amount ?? 0), 0)
  const churn30d = rows.filter(s => s.status === "canceled" && s.canceled_at && new Date(s.canceled_at).getTime() >= Date.now() - 30 * DAY).length

  return {
    mrr,
    arr: mrr * 12,
    payingCount: paying.length,
    activeTrialing: active.length,
    churn30d,
  }
}

export interface ContactItem {
  clubId: string
  clubName: string
  reason: string
  detail: string
  at: string
}

export async function getToContact(): Promise<{
  signups: ContactItem[]
  cancellations: ContactItem[]
  blocked: ContactItem[]
  reminders: ContactItem[]
}> {
  const since7 = isoDaysAgo(7)

  const [{ data: signupRows }, { data: cancelRows }, { data: blockedRows }, { data: reminderRows }] = await Promise.all([
    supabase.from("usage_events").select("club_id, created_at, metadata").eq("event_type", "signup").gte("created_at", since7).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("club_id, canceled_at, cancellation_reason").eq("status", "canceled").gte("canceled_at", isoDaysAgo(30)).order("canceled_at", { ascending: false }),
    supabase.from("usage_events").select("club_id, event_type, created_at").in("event_type", BLOCKED_EVENTS).gte("created_at", since7).order("created_at", { ascending: false }),
    supabase.from("account_notes").select("club_id, body, created_at").eq("remind", true).order("created_at", { ascending: false }),
  ])

  const allIds = [
    ...(signupRows ?? []).map(r => r.club_id),
    ...(cancelRows ?? []).map(r => r.club_id),
    ...(blockedRows ?? []).map(r => r.club_id),
    ...(reminderRows ?? []).map(r => r.club_id),
  ].filter(Boolean) as string[]
  const names = await clubNameMap(allIds)
  const name = (id: string | null) => (id && names.get(id)) || "Club inconnu"

  const signups: ContactItem[] = (signupRows ?? []).map(r => {
    const src = (r.metadata as { attribution?: { source?: string; referrer?: string } } | null)?.attribution
    return { clubId: r.club_id!, clubName: name(r.club_id), reason: "Nouveau signup", detail: src?.source ?? src?.referrer ?? "direct", at: r.created_at as string }
  })

  const cancellations: ContactItem[] = (cancelRows ?? []).filter(r => r.club_id).map(r => ({
    clubId: r.club_id as string, clubName: name(r.club_id), reason: "Résiliation", detail: (r.cancellation_reason as string) ?? "—", at: r.canceled_at as string,
  }))

  // Un seul item par club pour les blocages (le plus récent), avec le compte d'événements.
  const blockedByClub = new Map<string, { count: number; last: string; type: string }>()
  for (const r of blockedRows ?? []) {
    if (!r.club_id) continue
    const cur = blockedByClub.get(r.club_id)
    if (cur) cur.count += 1
    else blockedByClub.set(r.club_id, { count: 1, last: r.created_at as string, type: r.event_type as string })
  }
  const blocked: ContactItem[] = [...blockedByClub.entries()].map(([id, v]) => ({
    clubId: id, clubName: name(id), reason: "Limite atteinte", detail: `${v.count}× (${v.type})`, at: v.last,
  }))

  const reminders: ContactItem[] = (reminderRows ?? []).filter(r => r.club_id).map(r => ({
    clubId: r.club_id as string, clubName: name(r.club_id), reason: "À recontacter", detail: (r.body as string) ?? "", at: r.created_at as string,
  }))

  return { signups, cancellations, blocked, reminders }
}

export interface WeeklyDigest {
  signups: number
  blockedCount: number
  aiCostWeek: number
  aiMinutesWeek: number
}

// Agrégats de la semaine écoulée (7 j) pour le digest hebdo.
export async function getWeeklyDigest(): Promise<WeeklyDigest> {
  const since7 = isoDaysAgo(7)

  const [{ count: signups }, { count: blockedCount }, { data: videoRows }] = await Promise.all([
    supabase.from("usage_events").select("id", { count: "exact", head: true }).eq("event_type", "signup").gte("created_at", since7),
    supabase.from("usage_events").select("id", { count: "exact", head: true }).in("event_type", BLOCKED_EVENTS).gte("created_at", since7),
    supabase.from("usage_events").select("metadata").eq("event_type", "video_analysis").gte("created_at", since7),
  ])

  let aiCostWeek = 0
  let aiMinutesWeek = 0
  for (const r of videoRows ?? []) {
    const meta = r.metadata as { estimated_cost_usd?: number; duration_seconds?: number } | null
    aiCostWeek += Number(meta?.estimated_cost_usd ?? 0)
    aiMinutesWeek += Number(meta?.duration_seconds ?? 0) / 60
  }

  return { signups: signups ?? 0, blockedCount: blockedCount ?? 0, aiCostWeek, aiMinutesWeek }
}

export interface AcquisitionData {
  daily: { date: string; count: number }[]
  bySource: { source: string; count: number }[]
  totalSignups: number
  activatedCount: number
  activationRate: number
}

export async function getAcquisition(days = 30): Promise<AcquisitionData> {
  const since = isoDaysAgo(days)

  const { data: signupRows } = await supabase
    .from("usage_events")
    .select("club_id, created_at, metadata")
    .eq("event_type", "signup")
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  const signups = signupRows ?? []

  // Série journalière (bornée sur la fenêtre, jours à 0 inclus).
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * DAY).toISOString().slice(0, 10), 0)
  }
  for (const r of signups) {
    const d = (r.created_at as string).slice(0, 10)
    if (buckets.has(d)) buckets.set(d, (buckets.get(d) ?? 0) + 1)
  }
  const daily = [...buckets.entries()].map(([date, count]) => ({ date, count }))

  // Répartition par source.
  const sourceMap = new Map<string, number>()
  for (const r of signups) {
    const attr = (r.metadata as { attribution?: { source?: string; referrer?: string } } | null)?.attribution
    const source = attr?.source ?? (attr?.referrer ? "referral" : "direct")
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1)
  }
  const bySource = [...sourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count)

  // Activation : part des clubs signés-up ayant produit ≥1 event d'usage réel.
  const signupClubIds = [...new Set(signups.map(r => r.club_id).filter(Boolean))] as string[]
  let activatedCount = 0
  if (signupClubIds.length > 0) {
    const { data: acts } = await supabase
      .from("usage_events")
      .select("club_id")
      .in("event_type", ACTIVATION_EVENTS)
      .in("club_id", signupClubIds)
    const activated = new Set((acts ?? []).map(r => r.club_id))
    activatedCount = activated.size
  }

  return {
    daily,
    bySource,
    totalSignups: signups.length,
    activatedCount,
    activationRate: signupClubIds.length > 0 ? Math.round((activatedCount / signupClubIds.length) * 100) : 0,
  }
}
