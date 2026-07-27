import Link from "next/link"
import { notFound } from "next/navigation"
import PageHeader from "@/components/dashboard/PageHeader"
import { getPlayers } from "@/app/dashboard/effectif/actions"
import { toRosterPlayer } from "@/lib/roster"
import { getPlayerMatchHistory } from "@/app/dashboard/matchs/actions"

interface Props {
  params: Promise<{ joueurId: string }>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: "20px 22px", borderRadius: 12, marginBottom: 16,
      backgroundColor: "var(--bg-card)",
      border: "1px solid rgba(122,154,130,0.08)",
    }}>
      <h2 style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.1em", color: "rgba(122,154,130,0.6)",
        textTransform: "uppercase", marginBottom: 14,
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function parseDate(s: string) {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
}

function formatDate(s: string) {
  const d = parseDate(s)
  if (!d) return s
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

export default async function ProfilStatsPage({ params }: Props) {
  const { joueurId } = await params
  const [players, history] = await Promise.all([
    getPlayers(),
    getPlayerMatchHistory(joueurId),
  ])
  const roster = players.map(toRosterPlayer)
  const player = roster.find(p => p.id === joueurId)
  if (!player) notFound()

  const totals = history.reduce((acc, h) => ({
    matchesPlayed: acc.matchesPlayed + 1,
    starts:        acc.starts + (h.role === "starter" ? 1 : 0),
    goals:         acc.goals + h.goals,
    assists:       acc.assists + h.assists,
    minutesPlayed: acc.minutesPlayed + h.minutesPlayed,
  }), { matchesPlayed: 0, starts: 0, goals: 0, assists: 0, minutesPlayed: 0 })

  const SUMMARY = [
    { label: "Matchs joués", value: totals.matchesPlayed },
    { label: "Titularisations", value: totals.starts },
    { label: "Buts", value: totals.goals },
    { label: "Passes décisives", value: totals.assists },
    { label: "Minutes jouées", value: totals.minutesPlayed },
  ]

  return (
    <div className="page-pad" style={{ maxWidth: 800 }}>
      <Link href="/dashboard/data/joueurs" style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 10,
        letterSpacing: "0.06em", color: "rgba(122,154,130,0.5)",
        textDecoration: "none", display: "inline-block", marginBottom: 16,
      }}>
        ← STATS INDIVIDUELLES
      </Link>

      <PageHeader
        label={`${player.position === "GK" ? "GB" : player.position} · N°${player.number}`}
        title={player.name}
      />

      <Section title="Statistiques de la saison">
        {history.length === 0 ? (
          <p style={{
            fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
            fontSize: 13, color: "rgba(255,255,255,0.3)",
          }}>
            Aucune statistique enregistrée pour ce joueur cette saison.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {SUMMARY.map(s => (
              <div key={s.label}>
                <p style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 900, fontSize: 22, color: "rgba(255,255,255,0.85)", lineHeight: 1,
                }}>
                  {s.value}
                </p>
                <p style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginTop: 6,
                }}>
                  {s.label.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Historique des matchs">
        {history.length === 0 ? (
          <p style={{
            fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
            fontSize: 13, color: "rgba(255,255,255,0.3)",
          }}>
            Ce joueur n'apparaît dans aucune composition pour le moment.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {history.map(h => (
              <Link key={h.match.id} href={`/dashboard/matchs/${h.match.id}/bilan`} className="card-row" style={{
                padding: "9px 12px", borderRadius: 8, textDecoration: "none",
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(122,154,130,0.06)",
              }}>
                <div className="card-row__main">
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", width: 44 }}>
                    {formatDate(h.match.date)}
                  </span>
                  <span style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    vs {h.match.opponent}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
                    color: h.role === "starter" ? "#7A9A82" : "rgba(220,180,80,0.8)",
                  }}>
                    {h.role === "starter" ? "TITU" : "REMP"}
                  </span>
                </div>
                <div className="card-row__actions">
                  {h.goals > 0 && <span style={statTag("#7A9A82")}>⚽ {h.goals}</span>}
                  {h.assists > 0 && <span style={statTag("rgba(255,255,255,0.5)")}>🅰 {h.assists}</span>}
                  {h.yellowCards > 0 && <span style={statTag("#d4a847")}>🟨 {h.yellowCards}</span>}
                  {h.redCards > 0 && <span style={statTag("#e07070")}>🟥 {h.redCards}</span>}
                  <span style={statTag("rgba(255,255,255,0.3)")}>{h.minutesPlayed}&apos;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function statTag(color: string): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 700, color,
  }
}
