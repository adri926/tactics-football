"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getClubPlan, type SubscriptionPlan } from "@/app/dashboard/club/actions"
import { INVITABLE_ROLES } from "./roles"

export interface TeamMember {
  userId:   string
  name:     string
  email:    string
  imageUrl: string
  role:     string
}

export interface TeamInvitation {
  id:    string
  email: string
  role:  string
}

export interface TeamData {
  orgId:       string | null
  plan:        SubscriptionPlan
  isAdmin:     boolean
  members:     TeamMember[]
  invitations: TeamInvitation[]
}

async function requireOrgAdmin() {
  const { userId, orgId, has } = await auth()
  if (!userId) throw new Error("Non authentifié")
  if (!orgId) throw new Error("Aucune organisation active")
  if (!has({ role: "org:admin" })) throw new Error("Réservé à l'admin du club")
  return { userId, orgId }
}

export async function getTeamData(): Promise<TeamData> {
  const { userId, orgId, has } = await auth()
  if (!userId) throw new Error("Non authentifié")

  const plan = await getClubPlan()
  const isAdmin = has({ role: "org:admin" })

  if (!orgId) return { orgId: null, plan, isAdmin, members: [], invitations: [] }

  const clerk = await clerkClient()

  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 50 }),
    clerk.organizations.getOrganizationInvitationList({ organizationId: orgId, status: ["pending"], limit: 50 }),
  ])

  const members: TeamMember[] = memberships.map(m => ({
    userId:   m.publicUserData?.userId ?? "",
    name:     [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") || m.publicUserData?.identifier || "—",
    email:    m.publicUserData?.identifier ?? "",
    imageUrl: m.publicUserData?.imageUrl ?? "",
    role:     m.role,
  }))

  const teamInvitations: TeamInvitation[] = invitations.map(i => ({
    id:    i.id,
    email: i.emailAddress,
    role:  i.role,
  }))

  return { orgId, plan, isAdmin, members, invitations: teamInvitations }
}

const InviteSchema = z.object({
  email: z.string().email().max(200),
  role:  z.enum(["org:assistant_coach", "org:assistant_coach_treasurer", "org:admin"]),
})

export async function inviteMember(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, orgId } = await requireOrgAdmin()

  // [Backoffice — Phase 0] Multi-comptes admin = feature Pro.
  const plan = await getClubPlan()
  if (plan !== "pro") return { ok: false, error: "Passe à Footboard Pro pour inviter des membres." }

  const parsed = InviteSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Données invalides." }

  const clerk = await clerkClient()
  try {
    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId:  userId,
      emailAddress:   parsed.data.email,
      role:           parsed.data.role,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur lors de l'invitation." }
  }

  revalidatePath("/dashboard/club/equipe")
  return { ok: true }
}

export async function revokeInvitation(
  invitationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, orgId } = await requireOrgAdmin()

  const clerk = await clerkClient()
  try {
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId,
      requestingUserId: userId,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur lors de l'annulation." }
  }

  revalidatePath("/dashboard/club/equipe")
  return { ok: true }
}

export async function updateMemberRole(
  targetUserId: string,
  role: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { orgId } = await requireOrgAdmin()

  if (!INVITABLE_ROLES.some(r => r.key === role)) return { ok: false, error: "Rôle invalide." }

  const clerk = await clerkClient()
  try {
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
      role,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur lors de la mise à jour." }
  }

  revalidatePath("/dashboard/club/equipe")
  return { ok: true }
}

export async function removeMember(
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, orgId } = await requireOrgAdmin()

  if (targetUserId === userId) return { ok: false, error: "Tu ne peux pas te retirer toi-même." }

  const clerk = await clerkClient()
  try {
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur lors du retrait." }
  }

  revalidatePath("/dashboard/club/equipe")
  return { ok: true }
}
