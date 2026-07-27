// [Backoffice — Phase 0] Garde d'accès du backoffice plateforme + journal d'audit.
// Réservé à l'owner (user_id ∈ ADMIN_USER_IDS). N'utilise PAS les rôles Clerk club (org:admin…),
// qui servent aux clubs et n'ont rien à voir avec le super-admin plateforme.
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function getAdminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth()
  return !!userId && getAdminUserIds().includes(userId)
}

// À appeler en tête de chaque layout/page/action admin. notFound() (404) plutôt que 403 pour ne
// pas révéler l'existence du backoffice à un non-admin.
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth()
  if (!userId || !getAdminUserIds().includes(userId)) notFound()
  return userId
}

// Toute mutation admin (manuelle ou système) passe par ici AVANT d'agir.
export async function logAdminAction(action: {
  actor: string
  actionType: string
  targetType?: string | null
  targetId?: string | null
  payload?: unknown
}): Promise<void> {
  await supabase.from("admin_actions").insert({
    actor:       action.actor,
    action_type: action.actionType,
    target_type: action.targetType ?? null,
    target_id:   action.targetId ?? null,
    payload:     (action.payload ?? {}) as object,
  })
}
