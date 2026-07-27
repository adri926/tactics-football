"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { saveLineup, logPrint } from "@/app/dashboard/matchs/actions"
import type { Match } from "@/app/dashboard/matchs/actions"
import type { Player } from "@/app/dashboard/effectif/actions"
import PlayerStatusBadge from "@/components/dashboard/PlayerStatusBadge"

type Role = "starter" | "substitute" | null

interface Props {
  match:              Match
  players:            Player[]
  initialStarters:    string[]
  initialSubstitutes: string[]
}

function parseDate(s: string) {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
}

function formatDate(s: string) {
  const d = parseDate(s)
  if (!d) return s
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

export default function PreparationClient({ match, players, initialStarters, initialSubstitutes }: Props) {
  const [roles, setRoles] = useState<Record<string, Role>>(() => {
    const r: Record<string, Role> = {}
    initialStarters.forEach(id => { r[id] = "starter" })
    initialSubstitutes.forEach(id => { r[id] = "substitute" })
    return r
  })
  const [saved, setSaved]     = useState(initialStarters.length > 0 || initialSubstitutes.length > 0)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const [pending, startTransition] = useTransition()

  function handlePrint() {
    void logPrint(match.id) // [Backoffice — Phase 0] best-effort, ne bloque pas l'impression
    window.print()
  }

  function copyVenue() {
    if (!match.venue) return
    navigator.clipboard.writeText(match.venue).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const available   = players.filter(p => p.status === "available")
  const unavailable = players.filter(p => p.status !== "available")

  const starters    = available.filter(p => roles[p.id] === "starter")
  const substitutes = available.filter(p => roles[p.id] === "substitute")

  function toggleRole(id: string) {
    setRoles(prev => {
      const cur = prev[id]
      if (!cur) return { ...prev, [id]: "starter" }
      if (cur === "starter") return { ...prev, [id]: "substitute" }
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSaved(false)
    setError(null)
  }

  function handleSave() {
    startTransition(async () => {
      const sIds = Object.entries(roles).filter(([, r]) => r === "starter").map(([id]) => id)
      const rIds = Object.entries(roles).filter(([, r]) => r === "substitute").map(([id]) => id)
      const res = await saveLineup(match.id, sIds, rIds)
      if (res.ok) setSaved(true)
      else setError(res.error)
    })
  }

  const roleBadge = (role: Role) => {
    if (role === "starter")    return <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "#7A9A82", backgroundColor: "rgba(122,154,130,0.12)", border: "1px solid rgba(122,154,130,0.3)", padding: "2px 7px", borderRadius: 4 }}>T</span>
    if (role === "substitute") return <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(220,180,80,0.9)", backgroundColor: "rgba(220,180,80,0.08)", border: "1px solid rgba(220,180,80,0.25)", padding: "2px 7px", borderRadius: 4 }}>R</span>
    return <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.06em", color: "rgba(255,255,255,0.15)", padding: "2px 7px" }}>—</span>
  }

  return (
    <div className="page-pad" style={{ maxWidth: 1100 }}>

      {/* Back */}
      <Link href="/dashboard/matchs" style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 8, letterSpacing: "0.08em",
        color: "rgba(122,154,130,0.4)",
        display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14,
      }}>
        ← MATCHS
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            color: "rgba(122,154,130,0.5)", textTransform: "uppercase", marginBottom: 6,
          }}>
            Préparation match
          </p>
          <button
            onClick={handlePrint}
            className="no-print"
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              backgroundColor: "transparent",
              border: "1px solid rgba(122,154,130,0.2)",
              color: "rgba(122,154,130,0.55)", flexShrink: 0,
            }}
          >
            ⎙ IMPRIMER / PDF
          </button>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 900, fontSize: 24, letterSpacing: "0.02em",
          color: "rgba(255,255,255,0.95)", marginBottom: 8,
        }}>
          vs {match.opponent}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)" }}>
            {formatDate(match.date)} · {match.home_away === "home" ? "DOMICILE" : "EXTÉRIEUR"}
            {match.competition && ` · ${match.competition}`}
          </p>
          {match.venue && (
            <button onClick={copyVenue} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.06em", color: "rgba(122,154,130,0.55)" }}>
                📍 {match.venue}
              </span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, letterSpacing: "0.06em", color: copied ? "#7A9A82" : "rgba(255,255,255,0.2)" }}>
                {copied ? "COPIÉ ✓" : "COPIER"}
              </span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

        {/* Joueurs disponibles — sélection */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.1)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#7A9A82", textTransform: "uppercase" }}>
              Disponibles ({available.length})
            </p>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}>
              Cliquer pour assigner · T = Titulaire · R = Remplaçant
            </p>
          </div>

          {available.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "24px 0" }}>
              Aucun joueur disponible.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {available.map(p => {
                const role = roles[p.id] ?? null
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleRole(p.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      backgroundColor: role === "starter" ? "rgba(122,154,130,0.07)" : role === "substitute" ? "rgba(220,180,80,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${role === "starter" ? "rgba(122,154,130,0.2)" : role === "substitute" ? "rgba(220,180,80,0.15)" : "rgba(122,154,130,0.06)"}`,
                      textAlign: "left", width: "100%",
                      transition: "background-color 0.1s, border-color 0.1s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: 14, color: "rgba(255,255,255,0.15)", width: 22, textAlign: "center", flexShrink: 0 }}>
                        {p.number ?? "—"}
                      </span>
                      <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                        {p.first_name} {p.last_name.toUpperCase()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.06em", color: "rgba(122,154,130,0.4)" }}>
                        {p.position === "GK" ? "GB" : p.position}
                      </span>
                      {roleBadge(role)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panneau droit */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Composition summary */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.1)", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#7A9A82", textTransform: "uppercase", marginBottom: 14 }}>
              Composition
            </p>

            {/* Titulaires */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.08em", color: "rgba(122,154,130,0.6)", textTransform: "uppercase" }}>
                  Titulaires
                </p>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: starters.length === 11 ? "#7A9A82" : "rgba(255,255,255,0.3)" }}>
                  {starters.length}/11
                </span>
              </div>
              {starters.length === 0 ? (
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucun sélectionné</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {starters.map(p => (
                    <p key={p.id} style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                      <span style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono), monospace", fontSize: 9, marginRight: 6 }}>#{p.number ?? "—"}</span>
                      {p.first_name} {p.last_name.toUpperCase()}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Remplaçants */}
            <div style={{ borderTop: "1px solid rgba(122,154,130,0.08)", paddingTop: 12 }}>
              <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.08em", color: "rgba(220,180,80,0.5)", textTransform: "uppercase", marginBottom: 8 }}>
                Remplaçants ({substitutes.length})
              </p>
              {substitutes.length === 0 ? (
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucun sélectionné</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {substitutes.map(p => (
                    <p key={p.id} style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono), monospace", fontSize: 9, marginRight: 6 }}>#{p.number ?? "—"}</span>
                      {p.first_name} {p.last_name.toUpperCase()}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ marginTop: 16 }}>
              {error && (
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 11, color: "#e07070", marginBottom: 8 }}>{error}</p>
              )}
              <button
                onClick={handleSave}
                disabled={pending}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8,
                  cursor: pending ? "default" : "pointer",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  backgroundColor: saved ? "rgba(122,154,130,0.15)" : "#7A9A82",
                  border: saved ? "1px solid rgba(122,154,130,0.3)" : "none",
                  color: saved ? "#7A9A82" : "var(--bg)",
                }}
              >
                {pending ? "..." : saved ? "COMPOSITION SAUVEGARDÉE ✓" : "SAUVEGARDER"}
              </button>
            </div>
          </div>

          {/* Indisponibles */}
          {unavailable.length > 0 && (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.08)", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(224,112,112,0.5)", textTransform: "uppercase", marginBottom: 12 }}>
                Indisponibles ({unavailable.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {unavailable.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                      {p.first_name} {p.last_name.toUpperCase()}
                      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "rgba(255,255,255,0.15)", marginLeft: 6 }}>
                        #{p.number ?? "—"}
                      </span>
                    </p>
                    <PlayerStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA tactique */}
          <div style={{ backgroundColor: "rgba(122,154,130,0.06)", border: "1px solid rgba(122,154,130,0.18)", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#7A9A82", textTransform: "uppercase", marginBottom: 6 }}>
              Analyser un match
            </p>
            <p style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
              Uploadez la vidéo du dernier match pour préparer votre causerie d'avant-match.
            </p>
            <Link href="/tactique/analyse-video" style={{
              display: "inline-block",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              color: "#7A9A82",
              backgroundColor: "rgba(122,154,130,0.1)",
              border: "1px solid rgba(122,154,130,0.3)",
              padding: "9px 16px", borderRadius: 8,
            }}>
              ANALYSER UNE VIDÉO →
            </Link>
          </div>
        </div>
      </div>

      {/* Fiche imprimable — visible uniquement à l'impression */}
      <div className="print-sheet" style={{ fontFamily: "Georgia, serif", color: "#000", padding: "24px 32px" }}>
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 20 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", marginBottom: 4 }}>
            Footboard — Fiche de match
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>vs {match.opponent}</h1>
          <p style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
            {formatDate(match.date)} · {match.home_away === "home" ? "Domicile" : "Extérieur"}
            {match.competition ? ` · ${match.competition}` : ""}
            {match.venue ? ` · ${match.venue}` : ""}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Titulaires ({starters.length}/11)
            </p>
            {starters.map((p, i) => (
              <p key={p.id} style={{ fontSize: 12, marginBottom: 4, borderBottom: "1px solid #eee", paddingBottom: 3 }}>
                <span style={{ fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                <span style={{ marginRight: 6, color: "#888" }}>#{p.number ?? "—"}</span>
                {p.first_name} {p.last_name.toUpperCase()}
                <span style={{ float: "right", color: "#888", fontSize: 10 }}>{p.position}</span>
              </p>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Remplaçants ({substitutes.length})
            </p>
            {substitutes.map((p, i) => (
              <p key={p.id} style={{ fontSize: 12, marginBottom: 4, borderBottom: "1px solid #eee", paddingBottom: 3 }}>
                <span style={{ fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                <span style={{ marginRight: 6, color: "#888" }}>#{p.number ?? "—"}</span>
                {p.first_name} {p.last_name.toUpperCase()}
                <span style={{ float: "right", color: "#888", fontSize: 10 }}>{p.position}</span>
              </p>
            ))}
            {unavailable.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 20, marginBottom: 10, color: "#c00" }}>
                  Indisponibles
                </p>
                {unavailable.map(p => (
                  <p key={p.id} style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>
                    {p.first_name} {p.last_name.toUpperCase()} — {p.status === "injured" ? "Blessé" : "Incertain"}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
