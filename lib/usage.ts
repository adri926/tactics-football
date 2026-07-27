// [Backoffice — Phase 0] Journal d'usage (données réelles uniquement). Instrumente les points
// d'entrée existants + les tentatives bloquées. Best-effort : ne casse JAMAIS l'action métier.
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"

export type UsageEventType =
  | "board_created" | "session_created" | "player_added" | "fee_updated"
  | "login" | "signup" | "pdf_export" | "session_template_created"
  | "video_analysis" | "video_analysis_blocked"
  | "tactical_analysis" | "tactical_analysis_blocked"
  | "second_team_blocked" | "cotisations_blocked" | "archive_blocked"
  | "pdf_export_blocked" | "template_blocked"

export async function logUsage(event: {
  clubId?: string | null
  userId?: string | null
  eventType: UsageEventType
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await supabase.from("usage_events").insert({
      club_id:    event.clubId ?? null,
      user_id:    event.userId ?? null,
      event_type: event.eventType,
      metadata:   event.metadata ?? {},
    })
  } catch (e) {
    console.error("[usage] logUsage failed:", e)
  }
}

// Résout le club du scope courant (org active ou owner_id legacy) puis logge. Sert aux points
// d'instrumentation métier qui n'ont sous la main que le scope, pas l'id du club.
export async function logUsageForCurrentClub(
  eventType: UsageEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const scope = await getClubScope()
    const { data } = await supabase
      .from("clubs")
      .select("id")
      .eq(scope.column, scope.value)
      .maybeSingle()
    await logUsage({ clubId: (data?.id as string | undefined) ?? null, userId: scope.userId, eventType, metadata })
  } catch (e) {
    console.error("[usage] logUsageForCurrentClub failed:", e)
  }
}
