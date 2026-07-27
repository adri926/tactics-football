"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import MatchForm from "@/components/dashboard/MatchForm"
import PageHeader from "@/components/dashboard/PageHeader"
import ClubLogo from "@/components/dashboard/ClubLogo"
import TerrainSegment from "@/components/dashboard/TerrainSegment"
import OnboardingHint from "@/components/OnboardingHint"
import { deleteMatch } from "./actions"
import { sendConvocations } from "./convocations"
import type { Match } from "./actions"
import type { ConvocablePlayer } from "./convocations"
import type { Club } from "@/app/dashboard/club/actions"

function parseDate(dateStr: string): Date | null {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
}
function formatDate(dateStr: string) {
  const d = parseDate(dateStr)
  if (!d) return dateStr
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}
function dateKey(dateStr: string): string {
  const m = dateStr.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : dateStr
}

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MIL: 2, ATT: 3 }

function ConvocationModal({
  match, players, availability, onClose,
}: { match: Match; players: ConvocablePlayer[]; availability: Record<string, "present" | "absent">; onClose: () => void }) {
  const sorted = [...players].sort(
    (a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9)
  )
  const [selected, setSelected]   = useState<Set<string>>(
    new Set(players.filter(p => p.status === "available" && p.email).map(p => p.id))
  )
  const [sending, startSend]      = useTransition()
  const [result, setResult]       = useState<{ sent: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSend() {
    setError(null)
    startSend(async () => {
      const res = await sendConvocations(match.id, [...selected])
      if (res.ok) setResult({ sent: res.sent })
      else setError(res.error)
    })
  }

  const canSend = selected.size > 0 && !sending && !result

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid rgba(122,154,130,0.18)",
        borderRadius: 16, padding: "28px 28px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <p style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900, fontSize: 18, color: "rgba(255,255,255,0.92)",
            }}>
              Convoquer
            </p>
            <p style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, letterSpacing: "0.08em",
              color: "rgba(122,154,130,0.6)", marginTop: 4,
            }}>
              vs {match.opponent} · {formatDate(match.date)}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.3)", fontSize: 18, padding: 4,
          }}>✕</button>
        </div>

        {result ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px 0" }}>
            <p style={{ fontSize: 32 }}>✓</p>
            <p style={{
              fontFamily: "var(--font-body), sans-serif", fontWeight: 500,
              fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center",
            }}>
              {result.sent} convocation{result.sent > 1 ? "s" : ""} envoyée{result.sent > 1 ? "s" : ""}
            </p>
            <button onClick={onClose} style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 10, cursor: "pointer",
              fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
              backgroundColor: "#7A9A82", color: "var(--bg)", border: "none",
            }}>
              FERMER
            </button>
          </div>
        ) : (
          <>
            {/* Liste joueurs */}
            <div style={{ flex: 1, overflowY: "auto", margin: "16px 0", display: "flex", flexDirection: "column", gap: 4 }}>
              {sorted.length === 0 ? (
                <p style={{
                  fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
                  fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "24px 0",
                }}>
                  Aucun joueur dans l'effectif.
                </p>
              ) : sorted.map(p => {
                const hasEmail  = Boolean(p.email)
                const isChecked = selected.has(p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => hasEmail && toggle(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 8, cursor: hasEmail ? "pointer" : "default",
                      backgroundColor: isChecked ? "rgba(122,154,130,0.08)" : "transparent",
                      border: `1px solid ${isChecked ? "rgba(122,154,130,0.2)" : "transparent"}`,
                      opacity: hasEmail ? 1 : 0.38,
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      backgroundColor: isChecked ? "#7A9A82" : "transparent",
                      border: `1.5px solid ${isChecked ? "#7A9A82" : "rgba(122,154,130,0.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isChecked && <span style={{ color: "var(--bg)", fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.82)",
                      }}>
                        {p.first_name} {p.last_name}
                        <span style={{
                          fontFamily: "var(--font-mono), monospace", fontSize: 9,
                          color: "rgba(255,255,255,0.25)", marginLeft: 6,
                        }}>
                          {p.number ? `#${p.number} · ` : ""}{p.position === "GK" ? "GB" : p.position}
                        </span>
                      </p>
                      {!hasEmail && (
                        <p style={{
                          fontFamily: "var(--font-mono), monospace", fontSize: 8,
                          color: "rgba(224,112,112,0.5)", marginTop: 2,
                        }}>
                          Pas d'email renseigné
                        </p>
                      )}
                    </div>
                    {availability[p.id] && (
                      <span style={{
                        fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: availability[p.id] === "present" ? "#7A9A82" : "#e07070",
                        backgroundColor: availability[p.id] === "present" ? "rgba(122,154,130,0.12)" : "rgba(224,112,112,0.1)",
                        border: `1px solid ${availability[p.id] === "present" ? "rgba(122,154,130,0.35)" : "rgba(224,112,112,0.3)"}`,
                        padding: "3px 8px", borderRadius: 100, whiteSpace: "nowrap",
                      }}>
                        {availability[p.id] === "present" ? "✓ PRÉSENT" : "✗ ABSENT"}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {error && (
              <p style={{
                fontFamily: "var(--font-body), sans-serif", fontSize: 12, color: "#e07070",
                backgroundColor: "rgba(224,112,112,0.08)",
                border: "1px solid rgba(224,112,112,0.2)",
                borderRadius: 6, padding: "8px 12px", marginBottom: 12,
              }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
                backgroundColor: "transparent", border: "1px solid rgba(122,154,130,0.15)",
                color: "rgba(255,255,255,0.3)",
              }}>
                ANNULER
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  flex: 2, padding: "11px 0", borderRadius: 10,
                  cursor: canSend ? "pointer" : "default",
                  fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
                  backgroundColor: canSend ? "#7A9A82" : "rgba(122,154,130,0.2)",
                  border: "none", color: canSend ? "var(--bg)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.15s",
                }}
              >
                {sending ? "ENVOI..." : `ENVOYER (${selected.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface Props { matches: Match[]; players: ConvocablePlayer[]; club: Club | null; availability: Record<string, Record<string, "present" | "absent">>; activeTeamName?: string | null }

export default function MatchsClient({ matches, players, club, availability, activeTeamName }: Props) {
  const clubName = club?.name ?? "Mon club"
  const clubLogo = club?.logo ?? null
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Match | undefined>(undefined)
  const [convokingMatch, setConvoking]  = useState<Match | null>(null)
  const [deleting, startDelete]         = useTransition()
  const [tab, setTab]                   = useState<"a-venir" | "passes">("a-venir")

  const PAGE_SIZE = 10
  const [shownPlayed, setShownPlayed] = useState(PAGE_SIZE)

  const _d       = new Date()
  const today    = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`
  const upcoming = matches.filter(m => dateKey(m.date) >= today && m.goals_for === null)
    .sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)))
  const played   = matches.filter(m => dateKey(m.date) < today || m.goals_for !== null)
    .sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))

  function openAdd()      { setEditing(undefined); setShowForm(true) }
  function openEdit(m: Match) { setEditing(m); setShowForm(true) }
  function handleDelete(id: string) {
    if (!confirm("Supprimer ce match ?")) return
    startDelete(async () => { await deleteMatch(id) })
  }

  return (
    <>
      <TerrainSegment active="matchs" />
      <PageHeader
        label="Mon Club"
        title="Matchs"
        subtitle={activeTeamName ? `Équipe active : ${activeTeamName}` : undefined}
        action={
          <button onClick={openAdd} style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            padding: "10px 20px", borderRadius: 10, cursor: "pointer",
            backgroundColor: "#7A9A82", color: "var(--bg)", border: "none",
          }}>
            + AJOUTER UN MATCH
          </button>
        }
      />

      {played.length > 0 && (
        <OnboardingHint id="match-analyse" title="ANALYSE VIDÉO">
          Sur un match passé, tape <strong style={{ color: "var(--sauge)", fontWeight: 700 }}>◬ ANALYSER</strong> pour
          lancer l&apos;IA : timeline d&apos;événements, joueurs tagués et questions sur le match.
        </OnboardingHint>
      )}

      {/* Vide */}
      {matches.length === 0 && (
        <div style={{
          padding: "48px 32px", borderRadius: 12, textAlign: "center",
          backgroundColor: "var(--bg-card)", border: "1px dashed rgba(122,154,130,0.2)",
        }}>
          <p style={{
            fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 14,
            color: "rgba(255,255,255,0.3)", marginBottom: 8,
          }}>
            Aucun match pour l'instant.
          </p>
          <p style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.08em",
            color: "rgba(122,154,130,0.35)",
          }}>
            Utilise le bouton en haut à droite pour planifier ton premier match.
          </p>
        </div>
      )}

      {/* Onglets */}
      {matches.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            { key: "a-venir", label: `À venir (${upcoming.length})` },
            { key: "passes",  label: `Matchs passés (${played.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              padding: "9px 16px", borderRadius: 8, cursor: "pointer",
              backgroundColor: tab === t.key ? "rgba(122,154,130,0.12)" : "transparent",
              border: `1px solid ${tab === t.key ? "rgba(122,154,130,0.35)" : "rgba(122,154,130,0.12)"}`,
              color: tab === t.key ? "#7A9A82" : "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* À venir */}
      {tab === "a-venir" && (
        <div style={{ marginBottom: 36 }}>
          {upcoming.length === 0 ? (
            <div style={{
              padding: "40px 32px", borderRadius: 12, textAlign: "center",
              backgroundColor: "var(--bg-card)", border: "1px dashed rgba(122,154,130,0.15)",
            }}>
              <p style={{
                fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13,
                color: "rgba(255,255,255,0.3)",
              }}>
                Aucun match à venir programmé.
              </p>
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(m => (
              <div key={m.id} className="card-row" style={{
                padding: "16px 20px", borderRadius: 10,
                backgroundColor: "rgba(122,154,130,0.06)",
                border: "1px solid rgba(122,154,130,0.18)",
              }}>
                <div className="card-row__main">
                  <ClubLogo src={clubLogo} name={clubName} size={30} />
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    {m.home_away === "home" ? "vs" : "@"}
                  </span>
                  <ClubLogo src={m.opponent_logo} name={m.opponent} size={30} />
                  <div>
                    <p style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontWeight: 500, fontSize: 15, color: "rgba(255,255,255,0.85)",
                    }}>
                      {m.opponent}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 9, letterSpacing: "0.06em",
                      color: "rgba(255,255,255,0.3)", marginTop: 4,
                    }}>
                      {formatDate(m.date)} · {m.home_away === "home" ? "DOMICILE" : "EXTÉRIEUR"}
                      {m.competition && ` · ${m.competition}`}
                    </p>
                  </div>
                </div>
                <div className="card-row__actions">
                  {(() => {
                    const total = players.filter(p => p.status === "available" && p.email).length
                    const responded = Object.keys(availability[m.id] ?? {}).length
                    if (total === 0) return null
                    return (
                      <span style={{
                        fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
                        letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)",
                        backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap",
                      }}>
                        {responded}/{total} RÉPONDUS
                      </span>
                    )
                  })()}
                  <button onClick={() => setConvoking(m)} style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    backgroundColor: "rgba(122,154,130,0.1)",
                    border: "1px solid rgba(122,154,130,0.25)",
                    color: "#7A9A82",
                  }}>
                    CONVOQUER
                  </button>
                  <button onClick={() => openEdit(m)} style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 8, letterSpacing: "0.06em",
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(122,154,130,0.2)",
                    color: "rgba(122,154,130,0.5)",
                  }}>
                    SCORE
                  </button>
                  <Link href={`/dashboard/matchs/${m.id}/preparation`} style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    color: "#7A9A82",
                    backgroundColor: "rgba(122,154,130,0.1)",
                    border: "1px solid rgba(122,154,130,0.25)",
                    padding: "6px 14px", borderRadius: 8, whiteSpace: "nowrap",
                  }}>
                    PRÉPARER →
                  </Link>
                  <button onClick={() => handleDelete(m.id)} disabled={deleting} style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: 8,
                    padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(224,112,112,0.15)",
                    color: "rgba(224,112,112,0.4)",
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Matchs passés */}
      {tab === "passes" && (
        <div>
          {played.length === 0 ? (
            <div style={{
              padding: "40px 32px", borderRadius: 12, textAlign: "center",
              backgroundColor: "var(--bg-card)", border: "1px dashed rgba(122,154,130,0.15)",
            }}>
              <p style={{
                fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13,
                color: "rgba(255,255,255,0.3)",
              }}>
                Aucun match passé pour le moment.
              </p>
            </div>
          ) : (
          <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {played.slice(0, shownPlayed).map(m => {
              const hasScore = m.goals_for !== null && m.goals_against !== null
              const win  = hasScore && m.goals_for! > m.goals_against!
              const draw = hasScore && m.goals_for === m.goals_against
              const resultColor = win ? "#7A9A82" : draw ? "#d4a847" : "#e07070"
              const resultLabel = win ? "VICTOIRE" : draw ? "NUL" : "DÉFAITE"

              return (
                <div key={m.id} className="card-row" style={{
                  padding: "14px 20px", borderRadius: 10,
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(122,154,130,0.08)",
                }}>
                  <div className="card-row__main">
                    <ClubLogo src={clubLogo} name={clubName} size={28} />
                    {hasScore && (
                      <span style={{
                        fontFamily: "var(--font-display), system-ui, sans-serif",
                        fontWeight: 900, fontSize: 26, lineHeight: 1,
                        color: resultColor,
                        minWidth: 64, textAlign: "center",
                      }}>
                        {m.goals_for} – {m.goals_against}
                      </span>
                    )}
                    <ClubLogo src={m.opponent_logo} name={m.opponent} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontWeight: 500, fontSize: 14, color: "rgba(255,255,255,0.75)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {m.home_away === "home" ? "vs" : "@"} {m.opponent}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 9, letterSpacing: "0.06em",
                        color: "rgba(255,255,255,0.25)", marginTop: 3,
                      }}>
                        {formatDate(m.date)} · {m.home_away === "home" ? "DOM" : "EXT"}
                        {m.competition && ` · ${m.competition}`}
                      </p>
                    </div>
                  </div>
                  <div className="card-row__actions">
                    {hasScore ? (
                      <span style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
                        color: resultColor,
                        backgroundColor: `${resultColor}18`,
                        border: `1px solid ${resultColor}40`,
                        padding: "3px 10px", borderRadius: 100,
                      }}>
                        {resultLabel}
                      </span>
                    ) : (
                      <button onClick={() => openEdit(m)} style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 8, letterSpacing: "0.06em",
                        padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                        backgroundColor: "transparent",
                        border: "1px solid rgba(122,154,130,0.2)",
                        color: "rgba(122,154,130,0.5)",
                      }}>
                        SAISIR SCORE
                      </button>
                    )}
                    <Link href={`/dashboard/matchs/${m.id}/bilan`} style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 8, letterSpacing: "0.06em",
                      padding: "5px 10px", borderRadius: 6,
                      backgroundColor: "transparent",
                      border: "1px solid rgba(122,154,130,0.2)",
                      color: "rgba(122,154,130,0.5)",
                      textDecoration: "none",
                    }}>
                      BILAN
                    </Link>
                    <Link href={`/tactique/analyse-video?match=${m.id}`} style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
                      padding: "5px 10px", borderRadius: 6,
                      backgroundColor: "var(--sauge-dim)",
                      border: "1px solid var(--sauge-border)",
                      color: "var(--sauge)",
                      textDecoration: "none",
                    }}>
                      ◬ ANALYSER
                    </Link>
                    <button onClick={() => openEdit(m)} style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8,
                      padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                      backgroundColor: "transparent",
                      border: "1px solid rgba(122,154,130,0.15)",
                      color: "rgba(122,154,130,0.4)",
                    }}>ÉDITER</button>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting} style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8,
                      padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                      backgroundColor: "transparent",
                      border: "1px solid rgba(224,112,112,0.15)",
                      color: "rgba(224,112,112,0.4)",
                    }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
          {played.length > shownPlayed && (
            <button
              onClick={() => setShownPlayed(n => n + PAGE_SIZE)}
              style={{
                marginTop: 8, width: "100%",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                padding: "10px 0", borderRadius: 8, cursor: "pointer",
                backgroundColor: "transparent",
                border: "1px solid rgba(122,154,130,0.15)",
                color: "rgba(122,154,130,0.5)",
              }}
            >
              VOIR {Math.min(PAGE_SIZE, played.length - shownPlayed)} MATCH{played.length - shownPlayed > 1 ? "S" : ""} DE PLUS
            </button>
          )}
          </>
          )}
        </div>
      )}

      {showForm && (
        <MatchForm match={editing} onClose={() => setShowForm(false)} />
      )}

      {convokingMatch && (
        <ConvocationModal
          match={convokingMatch}
          players={players}
          availability={availability[convokingMatch.id] ?? {}}
          onClose={() => setConvoking(null)}
        />
      )}
    </>
  )
}
