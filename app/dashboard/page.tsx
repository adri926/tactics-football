import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import PlayerStatusBadge from "@/components/dashboard/PlayerStatusBadge"
import TodayPanel from "@/components/dashboard/TodayPanel"
import GettingStarted from "@/components/dashboard/GettingStarted"
import TacticHero from "@/components/dashboard/TacticHero"
import { getPlayers } from "@/app/dashboard/effectif/actions"
import { getMatches, getMatchStats } from "@/app/dashboard/matchs/actions"
import { getTrainings } from "@/app/dashboard/entrainements/actions"
import { getMyClub } from "@/app/dashboard/club/actions"
import { listAnalyses } from "@/app/tactique/analyse-video/actions"
import { TRAINING_TYPES } from "@/lib/training-types"
import { getCurrentSeason } from "@/lib/season"

function formatDate(dateStr: string) {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return dateStr
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

const TYPE_COLORS: Record<string, string> = {
  tactique: "#7A9A82", technique: "#6b9ab8", physique: "#d4a847",
  cpa: "#a87ab8", recuperation: "#7ab8a8", amical: "#e07070",
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const sp = await searchParams
  // Aperçu non destructif de l'écran premier run — désactivé en production.
  const previewStart = process.env.NODE_ENV !== "production" && sp.preview === "start"
  const [players, matches, trainings, club, user, analyses] = await Promise.all([
    getPlayers(),
    getMatches(),
    getTrainings(),
    getMyClub(),
    currentUser(),
    listAnalyses(),
  ])

  const lastAnalysis = analyses[0] ?? null

  const today = new Date().toISOString().slice(0, 10)

  const nextMatch = matches
    .filter(m => m.date.slice(0,10) >= today && m.goals_for === null)
    .sort((a, b) => a.date.slice(0,10).localeCompare(b.date.slice(0,10)))[0] ?? null

  const nextTraining = nextMatch ? null : trainings
    .filter(t => t.date.slice(0,10) >= today)
    .sort((a, b) => a.date.slice(0,10).localeCompare(b.date.slice(0,10)))[0] ?? null

  const hasUpcomingTraining = trainings.some(t => t.date.slice(0, 10) >= today)

  const lastPastMatch = matches
    .filter(m => m.date.slice(0,10) < today)
    .sort((a, b) => b.date.slice(0,10).localeCompare(a.date.slice(0,10)))[0] ?? null
  const lastPastMatchStats = lastPastMatch ? await getMatchStats(lastPastMatch.id) : []
  const unsavedBilanMatch = lastPastMatch && lastPastMatchStats.length === 0 ? lastPastMatch : null
  const hasAnalysisForLastMatch = !!lastPastMatch && analyses.some(a => a.match_id === lastPastMatch.id)

  const recentResults = matches
    .filter(m => m.goals_for !== null)
    .slice(0, 3)

  const nonAvailable = players.filter(p => p.status !== "available")

  const lastTrainings = trainings.slice(0, 4)

  const userName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Coach"
  const clubLabel = [club?.name, club?.level, `Saison ${getCurrentSeason()}`].filter(Boolean).join(" · ")

  // Premier run : tant que l'essentiel n'est pas en place (joueurs + au moins une échéance),
  // on guide via GettingStarted au lieu d'afficher un cockpit vide.
  const setupDone = players.length > 0 && (matches.length > 0 || trainings.length > 0)

  // Boucle IA : si une analyse a produit un diagnostic et qu'aucun entraînement n'est prévu,
  // on propose de générer la séance correspondante (referme la boucle vers "ta séance").
  const diag = analyses.find(a => Array.isArray(a.diagnosis) && a.diagnosis.length > 0)?.diagnosis
  const topWeakness = diag && diag.length > 0 ? diag[0] : null
  const suggested = topWeakness && !hasUpcomingTraining
    ? {
        href: `/dashboard/entrainements/nouvelle-seance?axe=${topWeakness.phase}:${topWeakness.style}&titre=${encodeURIComponent(topWeakness.title)}`,
        title: topWeakness.title,
      }
    : undefined

  if (!setupDone || previewStart) {
    return (
      <div className="page-pad" style={{ maxWidth: 1100 }}>
        <GettingStarted
          userName={userName}
          clubLabel={clubLabel}
          players={previewStart ? false : players.length > 0}
          match={previewStart ? false : matches.length > 0}
          session={previewStart ? false : trainings.length > 0}
        />
      </div>
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: 1100 }}>

      <TodayPanel
        userName={userName}
        clubLabel={clubLabel}
        nextMatch={nextMatch}
        nextTraining={nextTraining}
        concernedCount={nonAvailable.length}
        unsavedBilanMatch={unsavedBilanMatch}
        lastPastMatch={lastPastMatch}
        hasAnalysisForLastMatch={hasAnalysisForLastMatch}
        hasUpcomingTraining={hasUpcomingTraining}
        suggested={suggested}
      />

      {/* 2 columns */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>

        {/* Santé effectif */}
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.1)",
          borderRadius: 12, padding: "20px 22px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.14em", color: "rgba(122,154,130,0.5)", textTransform: "uppercase",
            }}>
              Santé effectif
            </p>
            <Link href="/dashboard/effectif" style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8,
              letterSpacing: "0.08em", color: "rgba(122,154,130,0.4)",
            }}>
              VOIR TOUT →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nonAvailable.length === 0 ? (
              <p style={{
                fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
                fontSize: 13, color: "rgba(255,255,255,0.3)",
              }}>
                {players.length === 0 ? "Aucun joueur dans l'effectif." : "Tous les joueurs sont disponibles."}
              </p>
            ) : nonAvailable.map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(122,154,130,0.07)",
              }}>
                <div>
                  <p style={{
                    fontFamily: "var(--font-body), sans-serif", fontWeight: 500,
                    fontSize: 13, color: "rgba(255,255,255,0.75)",
                  }}>
                    {p.first_name} {p.last_name}
                    <span style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 9,
                      letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)", marginLeft: 6,
                    }}>
                      {p.number ? `#${p.number} · ` : ""}{p.position === "GK" ? "GB" : p.position}
                    </span>
                  </p>
                  {p.injury_note && (
                    <p style={{
                      fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
                      fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2,
                    }}>
                      {p.injury_note}
                    </p>
                  )}
                </div>
                <PlayerStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Résultats récents */}
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.1)",
          borderRadius: 12, padding: "20px 22px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.14em", color: "rgba(122,154,130,0.5)", textTransform: "uppercase",
            }}>
              Résultats récents
            </p>
            <Link href="/dashboard/matchs" style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8,
              letterSpacing: "0.08em", color: "rgba(122,154,130,0.4)",
            }}>
              VOIR TOUT →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentResults.length === 0 ? (
              <p style={{
                fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
                fontSize: 13, color: "rgba(255,255,255,0.3)",
              }}>
                Aucun résultat enregistré.
              </p>
            ) : recentResults.map(m => {
              const gf = m.goals_for ?? 0
              const ga = m.goals_against ?? 0
              const win = gf > ga, draw = gf === ga
              const resultColor = win ? "#7A9A82" : draw ? "#d4a847" : "#e07070"
              const resultLabel = win ? "V" : draw ? "N" : "D"
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(122,154,130,0.07)",
                }}>
                  <div>
                    <p style={{
                      fontFamily: "var(--font-body), sans-serif", fontWeight: 500,
                      fontSize: 13, color: "rgba(255,255,255,0.75)",
                    }}>
                      vs {m.opponent}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 9,
                      letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)", marginTop: 2,
                    }}>
                      {formatDate(m.date)} · {m.home_away === "home" ? "DOM" : "EXT"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontFamily: "var(--font-display), system-ui, sans-serif",
                      fontWeight: 900, fontSize: 18, color: "rgba(255,255,255,0.8)",
                    }}>
                      {gf} – {ga}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8,
                      fontWeight: 700, letterSpacing: "0.1em",
                      color: resultColor, backgroundColor: `${resultColor}18`,
                      border: `1px solid ${resultColor}40`,
                      padding: "2px 7px", borderRadius: 100,
                    }}>
                      {resultLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <TacticHero lastAnalysis={lastAnalysis} />

      {/* Derniers entraînements */}
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid rgba(122,154,130,0.1)",
        borderRadius: 12, padding: "20px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.14em", color: "rgba(122,154,130,0.5)", textTransform: "uppercase",
          }}>
            Derniers entraînements
          </p>
          <Link href="/dashboard/entrainements" style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 8,
            letterSpacing: "0.08em", color: "rgba(122,154,130,0.4)",
          }}>
            VOIR TOUT →
          </Link>
        </div>

        {lastTrainings.length === 0 ? (
          <p style={{
            fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
            fontSize: 13, color: "rgba(255,255,255,0.3)",
          }}>
            Aucune séance enregistrée.
          </p>
        ) : (
          <div className="grid-2" style={{ gap: 10 }}>
            {lastTrainings.map(t => {
              const color = t.type ? (TYPE_COLORS[t.type] ?? "#7A9A82") : "#7A9A82"
              const typeLabel = t.type ? (TRAINING_TYPES.find(x => x.value === t.type)?.label ?? t.type) : null
              return (
                <div key={t.id} style={{
                  padding: "12px 14px", borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(122,154,130,0.07)",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 9,
                      letterSpacing: "0.06em", color: "rgba(122,154,130,0.5)",
                    }}>
                      {formatDate(t.date)}
                    </p>
                    {typeLabel && (
                      <span style={{
                        fontFamily: "var(--font-mono), monospace", fontSize: 7,
                        fontWeight: 700, letterSpacing: "0.08em",
                        color, backgroundColor: `${color}18`,
                        border: `1px solid ${color}40`,
                        padding: "2px 7px", borderRadius: 100,
                      }}>
                        {typeLabel.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body), sans-serif", fontWeight: 400,
                    fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.4,
                  }}>
                    {t.theme ?? typeLabel ?? "Séance"}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
