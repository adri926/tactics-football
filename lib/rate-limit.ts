// [Backoffice — Phase 0] Garde-fou coût Gemini : quota vidéo IA en MINUTES / SEMAINE, par plan
// (plan_limits + account_overrides via lib/plan). Remplace l'ancien plafond fixe 10/jour.
import { supabase } from "@/lib/supabase"
import { getEffectiveLimit } from "@/lib/plan"

export interface ClubScopeLite { column: "org_id" | "owner_id"; value: string }

// Début de la semaine ISO (lundi 00:00 UTC).
function startOfIsoWeek(d = new Date()): Date {
  const day = (d.getUTCDay() + 6) % 7 // lundi = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
}

// Minutes déjà consommées cette semaine par le club (somme des video_analyses.duration_sec).
export async function getVideoMinutesThisWeek(scope: ClubScopeLite): Promise<number> {
  const since = startOfIsoWeek().toISOString()
  const { data } = await supabase
    .from("video_analyses")
    .select("duration_sec")
    .eq(scope.column, scope.value)
    .gte("created_at", since)
  const sec = (data ?? []).reduce((s, r) => s + (Number(r.duration_sec) || 0), 0)
  return sec / 60
}

// Vérifie qu'une nouvelle analyse de `incomingMinutes` reste sous le quota hebdo du club.
export async function checkVideoAnalysisQuota(
  scope: ClubScopeLite,
  clubId: string,
  incomingMinutes = 0,
): Promise<{ ok: true; used: number; limit: number | null } | { ok: false; error: string; used: number; limit: number }> {
  const { maxValue } = await getEffectiveLimit(clubId, "video_analysis_minutes")
  const used = await getVideoMinutesThisWeek(scope)
  if (maxValue === null) return { ok: true, used, limit: null } // illimité (Pro / override)

  if (used + incomingMinutes > maxValue) {
    return {
      ok: false,
      error: `Quota d'analyse vidéo atteint (${maxValue} min/semaine). Il renouvelle lundi prochain.`,
      used, limit: maxValue,
    }
  }
  return { ok: true, used, limit: maxValue }
}

// Analyses tactiques déjà effectuées cette semaine (comptage des lignes tactical_situations —
// les hits de cache n'insèrent pas de nouvelle ligne donc ne comptent pas dans le quota).
export async function getTacticalAnalysesThisWeek(scope: ClubScopeLite): Promise<number> {
  const since = startOfIsoWeek().toISOString()
  const { count } = await supabase
    .from("tactical_situations")
    .select("id", { count: "exact", head: true })
    .eq(scope.column, scope.value)
    .gte("created_at", since)
  return count ?? 0
}

// Vérifie qu'une nouvelle analyse tactique reste sous le quota hebdo du club (garde-fou coût
// Claude + embedding Gemini, cf. supabase-migration-tactical-analysis-quota.sql).
export async function checkTacticalAnalysisQuota(
  scope: ClubScopeLite,
  clubId: string,
): Promise<{ ok: true; used: number; limit: number | null } | { ok: false; error: string; used: number; limit: number }> {
  const { maxValue } = await getEffectiveLimit(clubId, "tactical_analysis_requests")
  const used = await getTacticalAnalysesThisWeek(scope)
  if (maxValue === null) return { ok: true, used, limit: null } // illimité (Pro / override)

  if (used >= maxValue) {
    return {
      ok: false,
      error: `Quota d'analyses tactiques atteint (${maxValue}/semaine). Il renouvelle lundi prochain.`,
      used, limit: maxValue,
    }
  }
  return { ok: true, used, limit: maxValue }
}
