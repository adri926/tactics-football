// [Backoffice — Phase 0] Source unique de vérité pour le plan d'un club et ses limites effectives
// (plan_limits + account_overrides). Réutilisé par l'enforcement et le backoffice.
import { supabase } from "@/lib/supabase"

export type PlanTier = "amateur" | "semi_pro" | "pro"

export type PlanFeature =
  | "video_analysis_minutes" | "extra_team" | "season_archive"
  | "cotisations" | "medical" | "multi_admin" | "pdf_export" | "session_template"

export interface EffectiveLimit {
  maxValue: number | null            // null = illimité
  resetPeriod: "none" | "weekly"
}

// Le plan effectif : un abonnement non actif retombe en amateur (l'usage de base reste illimité).
export async function getPlanForClub(clubId: string): Promise<PlanTier> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("club_id", clubId)
    .maybeSingle()

  const plan = data?.plan as PlanTier | undefined
  if (!plan) return "amateur"
  if (data?.status && !["active", "trialing"].includes(data.status)) return "amateur"
  return plan
}

// Limite effective pour un compte : override compte prioritaire, sinon la config du plan.
export async function getEffectiveLimit(clubId: string, feature: PlanFeature): Promise<EffectiveLimit> {
  const { data: override } = await supabase
    .from("account_overrides")
    .select("max_value")
    .eq("club_id", clubId)
    .eq("feature", feature)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = await getPlanForClub(clubId)
  const { data: limit } = await supabase
    .from("plan_limits")
    .select("max_value, reset_period")
    .eq("plan", plan)
    .eq("feature", feature)
    .maybeSingle()

  const resetPeriod = (limit?.reset_period as "none" | "weekly") ?? "none"
  // Un override présent avec max_value null = illimité voulu → on distingue "présent" de "absent".
  const maxValue = override
    ? ((override.max_value as number | null) ?? null)
    : ((limit?.max_value as number | null) ?? null)

  return { maxValue, resetPeriod }
}
