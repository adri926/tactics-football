"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"
import PlayerStatusBadge from "@/components/dashboard/PlayerStatusBadge"
import PlayerForm from "@/components/dashboard/PlayerForm"
import ImportPlayersModal from "@/components/dashboard/ImportPlayersModal"
import PageHeader from "@/components/dashboard/PageHeader"
import { deletePlayer } from "./actions"
import type { Player } from "./actions"

type Position = "GK" | "DEF" | "MIL" | "ATT"
type MedicalStatus = "disponible" | "incertain" | "blesse"

const POSITION_ORDER: Position[] = ["GK", "DEF", "MIL", "ATT"]
const POSITION_LABELS: Record<Position, string> = {
  GK: "Gardiens", DEF: "Défenseurs", MIL: "Milieux", ATT: "Attaquants",
}

const STATUS_MAP: Record<Player["status"], MedicalStatus> = {
  available: "disponible",
  injured:   "blesse",
  uncertain: "incertain",
}

const COUNTER_DEFS: { status: MedicalStatus; label: string; color: string }[] = [
  { status: "disponible", label: "Disponibles", color: "#7A9A82" },
  { status: "incertain",  label: "Incertains",  color: "#d4a847" },
  { status: "blesse",     label: "Blessés",     color: "#e07070" },
]

const STATUS_FILTERS: { value: MedicalStatus | "tous"; label: string }[] = [
  { value: "tous",       label: "Tous" },
  { value: "disponible", label: "Disponibles" },
  { value: "incertain",  label: "Incertains" },
  { value: "blesse",     label: "Blessés" },
]

interface Props { players: Player[] }

export default function EffectifClient({ players }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showForm, setShowForm]     = useState(false)
  // Ouverture directe de l'import depuis la checklist "Bien démarrer" (?import=1).
  const [showImport, setShowImport] = useState(() => searchParams.get("import") === "1")
  const [editing, setEditing]       = useState<Player | undefined>(undefined)
  const [deleting, startDelete]     = useTransition()
  const [statusFilter, setStatusFilter] = useState<MedicalStatus | "tous">("tous")
  const [search, setSearch] = useState("")

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(p: Player) {
    setEditing(p)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce joueur ?")) return
    startDelete(async () => { await deletePlayer(id) })
  }

  const counts = COUNTER_DEFS.map(def => ({
    ...def,
    count: players.filter(p => STATUS_MAP[p.status] === def.status).length,
  }))

  const filteredPlayers = players.filter(p => {
    if (statusFilter !== "tous" && STATUS_MAP[p.status] !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      if (!fullName.includes(q)) return false
    }
    return true
  })

  const grouped = POSITION_ORDER.map(pos => ({
    pos,
    players: filteredPlayers
      .filter(p => p.position === pos)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  }))

  return (
    <>
      <PageHeader
        label="Mon Club"
        title="Effectif"
        subtitle={`${players.length} joueur${players.length !== 1 ? "s" : ""}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowImport(true)} style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              padding: "10px 18px", borderRadius: 10, cursor: "pointer",
              backgroundColor: "transparent", color: "rgba(122,154,130,0.7)",
              border: "1px solid rgba(122,154,130,0.25)",
            }}>
              IMPORTER UN EFFECTIF
            </button>
            <button onClick={openAdd} style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              padding: "10px 20px", borderRadius: 10, cursor: "pointer",
              backgroundColor: "#7A9A82", color: "var(--bg)", border: "none",
            }}>
              + AJOUTER UN JOUEUR
            </button>
          </div>
        }
      />

      {/* Suivi médical — compteurs + filtre par statut */}
      {players.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 14 }}>
            {counts.map(c => (
              <div key={c.status} style={{
                padding: "16px 18px", borderRadius: 12,
                backgroundColor: "var(--bg-card)",
                border: "1px solid rgba(122,154,130,0.08)",
              }}>
                <p style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 900, fontSize: 28, color: c.color, lineHeight: 1,
                }}>
                  {c.count}
                </p>
                <p style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)", marginTop: 6,
                }}>
                  {c.label.toUpperCase()}
                </p>
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", marginBottom: 10,
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 13, fontWeight: 400,
              padding: "9px 14px", borderRadius: 10,
              backgroundColor: "var(--bg-card)",
              border: "1px solid rgba(122,154,130,0.15)",
              color: "rgba(255,255,255,0.8)",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.05em",
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  color: statusFilter === f.value ? "var(--sauge)" : "rgba(255,255,255,0.4)",
                  backgroundColor: statusFilter === f.value ? "var(--sauge-dim)" : "transparent",
                  border: statusFilter === f.value ? "1px solid var(--sauge-border)" : "1px solid rgba(122,154,130,0.12)",
                }}>
                {f.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste vide */}
      {players.length === 0 && (
        <div style={{
          padding: "48px 32px", borderRadius: 12, textAlign: "center",
          backgroundColor: "var(--bg-card)",
          border: "1px dashed rgba(122,154,130,0.2)",
        }}>
          <p style={{
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 400, fontSize: 14,
            color: "rgba(255,255,255,0.3)", marginBottom: 8,
          }}>
            Aucun joueur pour l&apos;instant.
          </p>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, letterSpacing: "0.08em",
            color: "rgba(122,154,130,0.35)",
          }}>
            Utilise le bouton en haut à droite pour ajouter ton premier joueur.
          </p>
        </div>
      )}

      {/* Aucun joueur dans cette catégorie de statut */}
      {players.length > 0 && filteredPlayers.length === 0 && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
          fontSize: 13, color: "rgba(255,255,255,0.3)",
          padding: "24px 0", textAlign: "center",
        }}>
          Aucun joueur dans cette catégorie.
        </p>
      )}

      {/* Joueurs groupés par poste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {grouped.filter(g => g.players.length > 0).map(({ pos, players: group }) => (
          <div key={pos}>
            <p style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "#7A9A82", textTransform: "uppercase", marginBottom: 10,
            }}>
              {POSITION_LABELS[pos]} <span style={{ opacity: 0.4 }}>({group.length})</span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.map(p => (
                <div key={p.id} className="card-row" style={{
                  padding: "11px 16px", borderRadius: 10,
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(122,154,130,0.08)",
                }}>
                  <div className="card-row__main">
                  {/* Numéro */}
                  <span style={{
                    fontFamily: "var(--font-display), system-ui, sans-serif",
                    fontWeight: 900, fontSize: 18, lineHeight: 1,
                    color: "rgba(255,255,255,0.15)",
                    width: 26, textAlign: "center", flexShrink: 0,
                  }}>
                    {p.number ?? "—"}
                  </span>

                  {/* Nom */}
                  <Link href={`/dashboard/effectif/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                    <p style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontWeight: 500, fontSize: 14,
                      color: "rgba(255,255,255,0.8)",
                    }}>
                      {p.first_name} <span style={{ fontWeight: 700 }}>{p.last_name.toUpperCase()}</span>
                    </p>
                    {p.injury_note && (
                      <p style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontWeight: 400, fontSize: 11,
                        color: "rgba(255,255,255,0.25)", marginTop: 2,
                      }}>
                        {p.injury_note}
                      </p>
                    )}
                  </Link>
                  </div>

                  <div className="card-row__actions">
                  {/* Stats */}
                  <div style={{ display: "flex", gap: 18 }}>
                    {[
                      { label: "MJ", value: p.matches_played },
                      { label: "BUT", value: p.goals },
                      { label: "PAS", value: p.assists },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: "center" }}>
                        <p style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: 15, fontWeight: 700, lineHeight: 1,
                          color: "rgba(255,255,255,0.6)",
                        }}>
                          {stat.value}
                        </p>
                        <p style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: 7, letterSpacing: "0.08em",
                          color: "rgba(255,255,255,0.2)", marginTop: 2,
                        }}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <PlayerStatusBadge status={p.status} />

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 8, letterSpacing: "0.06em",
                        padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                        backgroundColor: "transparent",
                        border: "1px solid rgba(122,154,130,0.2)",
                        color: "rgba(122,154,130,0.5)",
                      }}
                    >
                      ÉDITER
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting}
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 8, letterSpacing: "0.06em",
                        padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                        backgroundColor: "transparent",
                        border: "1px solid rgba(224,112,112,0.15)",
                        color: "rgba(224,112,112,0.4)",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <PlayerForm
          player={editing}
          onClose={() => setShowForm(false)}
        />
      )}

      {showImport && (
        <ImportPlayersModal
          onClose={() => setShowImport(false)}
          onImported={() => router.refresh()}
        />
      )}
    </>
  )
}
