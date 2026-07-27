"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import PageHeader from "@/components/dashboard/PageHeader"
import {
  createTeam,
  renameTeam,
  deleteTeam,
  setTeamPlayer,
  type TeamsManagementData,
  type TeamWithPlayers,
  type TeamPlayer,
} from "./actions"

type Position = "GK" | "DEF" | "MIL" | "ATT"

const POSITION_ORDER: Position[] = ["GK", "DEF", "MIL", "ATT"]
const POSITION_LABELS: Record<Position, string> = {
  GK: "Gardiens", DEF: "Défenseurs", MIL: "Milieux", ATT: "Attaquants",
}

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

interface Props {
  data: TeamsManagementData
}

export default function EquipesClient({ data }: Props) {
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [error, setError]     = useState<string | null>(null)
  const [pending, start]      = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError(null)
    start(async () => {
      const res = await createTeam(newName.trim())
      if (res.ok) { setNewName(""); router.refresh() }
      else setError(res.error)
    })
  }

  return (
    <div className="page-pad" style={{ maxWidth: 760 }}>
      <PageHeader
        label="Mon Club"
        title="Équipes"
        subtitle={`${data.teams.length} équipe${data.teams.length !== 1 ? "s" : ""}`}
      />

      <div style={{ ...SECTION, marginBottom: 16 }}>
        <p style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
          color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 16,
        }}>
          Nouvelle équipe
        </p>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Nom</label>
            <input
              type="text" required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Équipe 2"
              style={INPUT}
            />
          </div>
          <button type="submit" disabled={pending} style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            cursor: pending ? "default" : "pointer",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            backgroundColor: "#7A9A82", color: "var(--bg)",
            whiteSpace: "nowrap",
          }}>
            {pending ? "..." : "+ CRÉER"}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            players={data.players}
            canDelete={data.teams.length > 1}
          />
        ))}
      </div>
    </div>
  )
}

function TeamCard({ team, players, canDelete }: {
  team: TeamWithPlayers
  players: TeamPlayer[]
  canDelete: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(team.name)
  const [expanded, setExpanded] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pending, start]      = useTransition()

  function handleRename() {
    if (!name.trim() || name.trim() === team.name) { setEditing(false); setName(team.name); return }
    start(async () => {
      const res = await renameTeam(team.id, name.trim())
      if (res.ok) { setEditing(false); router.refresh() }
      else { setError(res.error); setName(team.name) }
    })
  }

  function handleDelete() {
    if (!confirm(`Supprimer "${team.name}" ?`)) return
    start(async () => {
      const res = await deleteTeam(team.id)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  function handleToggle(playerId: string, assigned: boolean) {
    start(async () => {
      const res = await setTeamPlayer(team.id, playerId, assigned)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  const grouped = POSITION_ORDER.map(pos => ({
    pos,
    players: players.filter(p => p.position === pos),
  }))

  return (
    <div style={SECTION}>
      <div className="card-row">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditing(false); setName(team.name) } }}
            style={{ ...INPUT, flex: 1, fontWeight: 700 }}
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900, fontSize: 18, color: "rgba(255,255,255,0.92)",
              flex: 1, cursor: "pointer",
            }}
            title="Cliquer pour renommer"
          >
            {team.name}
          </p>
        )}

        <div className="card-row__actions">
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.08em", color: "rgba(122,154,130,0.6)",
          textTransform: "uppercase", padding: "4px 10px", borderRadius: 100,
          backgroundColor: "var(--sauge-dim)", border: "1px solid var(--sauge-border)",
          whiteSpace: "nowrap",
        }}>
          {team.playerIds.length} joueur{team.playerIds.length !== 1 ? "s" : ""}
        </span>

        <button onClick={() => setExpanded(e => !e)} style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.06em", padding: "6px 12px", borderRadius: 8, cursor: "pointer",
          backgroundColor: "transparent", border: "1px solid rgba(122,154,130,0.2)",
          color: "rgba(122,154,130,0.7)", whiteSpace: "nowrap",
        }}>
          {expanded ? "FERMER" : "GÉRER LES JOUEURS"}
        </button>

        {canDelete && (
          <button onClick={handleDelete} disabled={pending} style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.06em", padding: "6px 10px", borderRadius: 8, cursor: pending ? "default" : "pointer",
            backgroundColor: "transparent", border: "1px solid rgba(224,112,112,0.15)",
            color: "rgba(224,112,112,0.5)",
          }}>
            SUPPRIMER
          </button>
        )}
        </div>
      </div>

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

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(122,154,130,0.08)" }}>
          {players.length === 0 && (
            <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              Aucun joueur dans l'effectif.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {grouped.filter(g => g.players.length > 0).map(({ pos, players: group }) => (
              <div key={pos}>
                <p style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  color: "#7A9A82", textTransform: "uppercase", marginBottom: 8,
                }}>
                  {POSITION_LABELS[pos]}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {group.map(p => {
                    const checked = team.playerIds.includes(p.id)
                    return (
                      <label key={p.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 8, cursor: pending ? "default" : "pointer",
                        backgroundColor: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(122,154,130,0.06)",
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={pending}
                          onChange={e => handleToggle(p.id, e.target.checked)}
                        />
                        <span style={{
                          fontFamily: "var(--font-body), sans-serif", fontSize: 13,
                          color: "rgba(255,255,255,0.8)",
                        }}>
                          {p.number != null ? `${p.number} · ` : ""}{p.first_name} {p.last_name.toUpperCase()}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
