"use server"

import { dbError } from "@/lib/db-error"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { logUsageForCurrentClub } from "@/lib/usage"
import type { SessionType } from "@/types/training"

interface BlockInput {
  exerciseId: string
  duration: number
  order: number
  customNotes: string
}

interface SessionInput {
  name: string
  date: string
  sessionType: SessionType
  playerCount: number
  blocks: BlockInput[]
}

export async function saveSession(
  input: SessionInput
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const scope = await getClubScope()

  if (!input.name?.trim()) return { ok: false, error: "Nom requis" }
  if (!input.date?.match(/^\d{4}-\d{2}-\d{2}$/)) return { ok: false, error: "Date invalide" }
  if (!input.blocks?.length) return { ok: false, error: "Aucun exercice" }

  const totalDuration = input.blocks.reduce((s, b) => s + (b.duration ?? 0), 0)

  const { data: session, error: sessionErr } = await supabase
    .from("training_sessions")
    .insert({
      owner_id: scope.userId,
      org_id: scope.orgId,
      name: input.name.trim(),
      date: input.date,
      session_type: input.sessionType,
      player_count: input.playerCount,
      total_duration: totalDuration,
    })
    .select("id")
    .single()

  if (sessionErr || !session) return { ok: false, error: sessionErr?.message ?? "Erreur serveur" }

  const { error: blocksErr } = await supabase
    .from("session_blocks")
    .insert(
      input.blocks.map(b => ({
        session_id: session.id,
        exercise_id: b.exerciseId,
        duration: b.duration,
        block_order: b.order,
        custom_notes: b.customNotes || null,
      }))
    )

  if (blocksErr) {
    await supabase.from("training_sessions").delete().eq("id", session.id)
    return dbError(blocksErr)
  }

  await logUsageForCurrentClub("session_created", { session_id: session.id, blocks: input.blocks.length }) // [Backoffice — Phase 0]
  revalidatePath("/dashboard/entrainements")
  return { ok: true, sessionId: session.id }
}

export async function deleteSession(
  sessionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const scope = await getClubScope()

  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", sessionId)
    .eq(scope.column, scope.value)

  if (error) return { ok: false, error: "Erreur lors de la suppression." }

  revalidatePath("/dashboard/entrainements")
  return { ok: true }
}
