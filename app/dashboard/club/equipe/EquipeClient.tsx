"use client"

import { useState, useTransition } from "react"
import PageHeader from "@/components/dashboard/PageHeader"
import {
  inviteMember,
  revokeInvitation,
  updateMemberRole,
  removeMember,
  type TeamData,
} from "./actions"
import { INVITABLE_ROLES } from "./roles"

const SECTION: React.CSSProperties = {
  padding: "20px 22px", borderRadius: 12,
  backgroundColor: "var(--bg-card)",
  border: "1px solid rgba(122,154,130,0.08)",
}

const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
  color: "rgba(122,154,130,0.5)", textTransform: "uppercase",
  marginBottom: 6, display: "block",
}

const INPUT: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontWeight: 400, fontSize: 13,
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(122,154,130,0.15)",
  borderRadius: 8, padding: "9px 12px",
  color: "rgba(255,255,255,0.85)",
  width: "100%", outline: "none",
}

const ROLE_LABELS: Record<string, string> = {
  "org:admin": "Admin",
  "org:assistant_coach": "Coach adjoint",
  "org:assistant_coach_treasurer": "Coach adjoint + trésorerie",
  "org:member": "Membre",
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

interface Props {
  data: TeamData
}

export default function EquipeClient({ data }: Props) {
  const [form, setForm]   = useState({ email: "", role: INVITABLE_ROLES[0].key as string })
  const [error, setError] = useState<string | null>(null)
  const [pending, start]  = useTransition()

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await inviteMember(form)
      if (res.ok) setForm({ email: "", role: INVITABLE_ROLES[0].key })
      else setError(res.error)
    })
  }

  return (
    <div className="page-pad" style={{ maxWidth: 680 }}>
      <PageHeader label="Mon club" title="Équipe" subtitle="Donne accès à la plateforme aux membres du club (coach adjoint, trésorier)." />

      {data.plan !== "pro" && (
        <div style={{ ...SECTION, textAlign: "center", padding: "36px 28px" }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            color: "var(--sauge)", textTransform: "uppercase", marginBottom: 10,
          }}>
            Footboard Club
          </p>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: 22, color: "rgba(255,255,255,0.95)", marginBottom: 10,
          }}>
            Ajoute ton staff à la plateforme
          </h2>
          <p style={{
            fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13,
            lineHeight: 1.6, color: "rgba(255,255,255,0.4)",
            maxWidth: 420, margin: "0 auto 20px",
          }}>
            Avec Footboard Club, invite un coach adjoint ou un trésorier : ils accèdent aux mêmes joueurs, matchs et entraînements que toi, avec des rôles dédiés.
          </p>
          <button disabled style={{
            padding: "12px 24px", borderRadius: 10, border: "none",
            cursor: "not-allowed",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            backgroundColor: "rgba(122,154,130,0.5)",
            color: "var(--bg)",
          }}>
            PASSER À FOOTBOARD CLUB — BIENTÔT
          </button>
        </div>
      )}

      {data.plan === "pro" && (
        <>
          {data.isAdmin && (
            <div style={{ ...SECTION, marginBottom: 16 }}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 16,
              }}>
                Inviter un membre
              </p>
              <form onSubmit={handleInvite} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL}>Email</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="coach.adjoint@email.com"
                    style={INPUT}
                  />
                </div>
                <div style={{ width: 220 }}>
                  <label style={LABEL}>Rôle</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    style={{ ...INPUT, cursor: "pointer" }}
                  >
                    {INVITABLE_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={pending} style={{
                  padding: "9px 18px", borderRadius: 8, border: "none",
                  cursor: pending ? "default" : "pointer",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  backgroundColor: "#7A9A82", color: "var(--bg)",
                  whiteSpace: "nowrap",
                }}>
                  {pending ? "..." : "INVITER"}
                </button>
              </form>
              {error && (
                <p style={{
                  fontFamily: "var(--font-body), sans-serif", fontSize: 12,
                  color: "#e07070", backgroundColor: "rgba(224,112,112,0.08)",
                  border: "1px solid rgba(224,112,112,0.15)",
                  borderRadius: 6, padding: "8px 12px", marginTop: 12,
                }}>
                  {error}
                </p>
              )}
            </div>
          )}

          {data.invitations.length > 0 && data.isAdmin && (
            <div style={{ ...SECTION, marginBottom: 16 }}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 16,
              }}>
                Invitations en attente
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.invitations.map(inv => (
                  <InvitationRow key={inv.id} invitation={inv} />
                ))}
              </div>
            </div>
          )}

          <div style={SECTION}>
            <p style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 16,
            }}>
              Membres ({data.members.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.members.map(m => (
                <MemberRow key={m.userId} member={m} isAdmin={data.isAdmin} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MemberRow({ member, isAdmin }: { member: TeamData["members"][number]; isAdmin: boolean }) {
  const [pending, start] = useTransition()

  function handleRoleChange(role: string) {
    start(async () => { await updateMemberRole(member.userId, role) })
  }

  function handleRemove() {
    start(async () => { await removeMember(member.userId) })
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(122,154,130,0.06)",
    }}>
      {member.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.imageUrl} alt="" width={28} height={28} style={{ borderRadius: "50%", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
          {member.name}
        </p>
        <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {member.email}
        </p>
      </div>
      {isAdmin && member.role !== "org:admin" ? (
        <select
          value={member.role}
          disabled={pending}
          onChange={e => handleRoleChange(e.target.value)}
          style={{ ...INPUT, width: 200, cursor: pending ? "default" : "pointer", padding: "6px 10px", fontSize: 12 }}
        >
          {INVITABLE_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      ) : (
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.08em", color: "rgba(122,154,130,0.6)",
          textTransform: "uppercase", padding: "4px 10px", borderRadius: 100,
          backgroundColor: "var(--sauge-dim)", border: "1px solid var(--sauge-border)",
          whiteSpace: "nowrap",
        }}>
          {roleLabel(member.role)}
        </span>
      )}
      {isAdmin && member.role !== "org:admin" && (
        <button onClick={handleRemove} disabled={pending} style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.08em", color: "rgba(224,112,112,0.65)",
          backgroundColor: "transparent", border: "none", cursor: pending ? "default" : "pointer",
          padding: "4px 6px",
        }}>
          RETIRER
        </button>
      )}
    </div>
  )
}

function InvitationRow({ invitation }: { invitation: TeamData["invitations"][number] }) {
  const [pending, start] = useTransition()

  function handleRevoke() {
    start(async () => { await revokeInvitation(invitation.id) })
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(122,154,130,0.06)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
          {invitation.email}
        </p>
      </div>
      <span style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", padding: "4px 10px", borderRadius: 100,
        border: "1px solid rgba(122,154,130,0.1)", whiteSpace: "nowrap",
      }}>
        {roleLabel(invitation.role)} · en attente
      </span>
      <button onClick={handleRevoke} disabled={pending} style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.08em", color: "rgba(224,112,112,0.65)",
        backgroundColor: "transparent", border: "none", cursor: pending ? "default" : "pointer",
        padding: "4px 6px",
      }}>
        ANNULER
      </button>
    </div>
  )
}
