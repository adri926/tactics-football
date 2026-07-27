import Link from "next/link"

const STATS = [
  { value: "IA", label: "ANALYSE VIDÉO" },
  { value: "16", label: "FORMATIONS" },
  { value: "12", label: "CONCEPTS ANIMÉS" },
]

const PRIMARY = {
  tag: "IA · ANALYSE VIDÉO",
  title: "ANALYSE VIDÉO",
  desc: "Upload la vidéo d'un match : l'IA génère une timeline d'événements, tague tes joueurs et répond à tes questions en langage naturel. Le cœur tactique de Footboard.",
  href: "/tactique/analyse-video",
  cta: "ANALYSER UN MATCH",
}

const SECONDARY = [
  {
    num: "01",
    tag: "TABLEAU TACTIQUE",
    title: "DIGIBOARD",
    desc: "Dessine tes schémas en direct : place les joueurs, trace les trajectoires, explique ta vision au groupe.",
    href: "/tactique/digiboard",
    cta: "OUVRIR →",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1" opacity="0.3" />
        <path d="M12 4v16" strokeWidth="0.8" opacity="0.6" />
        <circle cx="8" cy="9" r="1.5" />
        <circle cx="16" cy="14" r="1.5" />
        <path d="M9 10l6 3" strokeLinecap="round" strokeDasharray="2 2" opacity="0.7" />
      </svg>
    ),
  },
  {
    num: "02",
    tag: "APPRENTISSAGE",
    title: "CONCEPTS",
    desc: "Systèmes de jeu, pressing, transitions — les fondamentaux en schémas animés.",
    href: "/tactique/concepts",
    cta: "LIRE →",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" strokeWidth="1" opacity="0.3" />
        <path d="M3 12h4M17 12h4M12 3v4M12 17v4" strokeLinecap="round" opacity="0.6" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

function PitchFull() {
  return (
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute", right: -10, top: "50%",
        transform: "translateY(-50%)",
        width: 260, opacity: 0.13, pointerEvents: "none",
      }}>
      {/* Pelouse rayée */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={i * 32} y="0" width="16" height="140"
          fill="rgba(122,154,130,0.18)" />
      ))}
      {/* Contour */}
      <rect x="2" y="2" width="216" height="136" rx="3"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="1" />
      {/* Ligne médiane */}
      <line x1="110" y1="2" x2="110" y2="138"
        stroke="rgba(122,154,130,1)" strokeWidth="0.7" />
      {/* Rond central */}
      <circle cx="110" cy="70" r="22"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.7" />
      <circle cx="110" cy="70" r="1.5" fill="rgba(122,154,130,1)" />
      {/* Surface gauche */}
      <rect x="2" y="40" width="34" height="60"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.7" />
      <rect x="2" y="52" width="14" height="36"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.5" />
      {/* Surface droite */}
      <rect x="184" y="40" width="34" height="60"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.7" />
      <rect x="206" y="52" width="14" height="36"
        fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.5" />
      {/* Arcs surfaces */}
      <path d="M36 58 Q50 70 36 82" fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.5" />
      <path d="M184 58 Q170 70 184 82" fill="none" stroke="rgba(122,154,130,1)" strokeWidth="0.5" />
      {/* Pions tactiques stylisés */}
      <circle cx="55" cy="45" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="55" cy="95" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="80" cy="28" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="80" cy="70" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="80" cy="112" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="105" cy="50" r="3.5" fill="rgba(122,154,130,0.7)" />
      <circle cx="105" cy="90" r="3.5" fill="rgba(122,154,130,0.7)" />
      {/* Flèche de mouvement */}
      <path d="M83 70 Q95 55 105 50" fill="none" stroke="rgba(122,154,130,0.8)"
        strokeWidth="0.8" strokeDasharray="2 2" />
      <polygon points="104,47 108,52 101,52" fill="rgba(122,154,130,0.8)" />
    </svg>
  )
}

export default function TactiquePage() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 64px" }}>

        {/* Breadcrumb */}
        <Link href="/" style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, letterSpacing: "0.08em",
          color: "var(--text-faint)",
          textDecoration: "none", display: "inline-block", marginBottom: 32,
        }}>
          ← ACCUEIL
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, letterSpacing: "0.12em",
            color: "var(--sauge)", marginBottom: 10,
          }}>
            STUDIO TACTIQUE
          </p>
          <h1 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: 56, lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}>
            STUDIO
          </h1>
          <p style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: 15, color: "var(--text-muted)",
            marginTop: 12, maxWidth: 440, lineHeight: 1.5,
          }}>
            Analyse tes matchs avec l&apos;IA, dessine tes schémas, forme ton groupe.
          </p>
        </div>

        {/* Strip stats football */}
        <div style={{
          display: "flex", gap: 0,
          borderTop: "1px solid rgba(122,154,130,0.15)",
          borderBottom: "1px solid rgba(122,154,130,0.15)",
          marginBottom: 32,
        }}>
          {STATS.map(({ value, label }, i) => (
            <div key={label} style={{
              flex: 1, padding: "14px 0",
              borderLeft: i > 0 ? "1px solid rgba(122,154,130,0.1)" : "none",
              paddingLeft: i > 0 ? 24 : 0,
              paddingRight: 24,
            }}>
              <p style={{
                fontFamily: "var(--font-display), system-ui, sans-serif",
                fontWeight: 900, fontSize: 26, lineHeight: 1,
                color: "var(--sauge)",
              }}>{value}</p>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 8, letterSpacing: "0.1em",
                color: "var(--text-faint)", marginTop: 4,
              }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Card héro — Digiboard */}
        <Link href={PRIMARY.href} style={{ textDecoration: "none", display: "block", marginBottom: 16 }}>
          <div style={{
            position: "relative", overflow: "hidden",
            background: "var(--bg-card-hi)",
            border: "1px solid var(--sauge-border)",
            borderLeft: "3px solid var(--sauge)",
            borderRadius: 16,
            padding: "36px 40px",
          }}>
            <PitchFull />

            <div style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, letterSpacing: "0.12em",
              color: "var(--sauge)",
              marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--sauge)", display: "inline-block",
              }} />
              {PRIMARY.tag}
            </div>

            <h2 style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900, fontSize: 38, lineHeight: 1,
              color: "var(--text-primary)", marginBottom: 14,
              letterSpacing: "0.01em",
            }}>
              {PRIMARY.title}
            </h2>

            <p style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 14, color: "var(--text-muted)",
              lineHeight: 1.6, maxWidth: 460, marginBottom: 28,
            }}>
              {PRIMARY.desc}
            </p>

            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              color: "var(--sauge)",
              padding: "8px 18px",
              border: "1px solid var(--sauge-border)",
              borderRadius: 8,
              background: "var(--sauge-dim)",
              display: "inline-block",
            }}>
              {PRIMARY.cta} →
            </span>
          </div>
        </Link>

        {/* Séparateur */}
        <div style={{ height: 1, background: "rgba(122,154,130,0.10)", margin: "28px 0" }} />

        {/* Grille secondaire */}
        <div className="grid-2" style={{ gap: 12 }}>
          {SECONDARY.map(({ num, tag, title, desc, href, cta, icon }) => (
            <Link key={href} href={href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid rgba(122,154,130,0.13)",
                borderRadius: 14,
                padding: "24px 22px",
                height: "100%",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 9, letterSpacing: "0.12em",
                    color: "var(--sauge)",
                    background: "var(--sauge-dim)",
                    border: "1px solid var(--sauge-border)",
                    padding: "2px 7px", borderRadius: 100,
                  }}>
                    {tag}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 11, color: "var(--text-faint)", fontWeight: 700,
                  }}>
                    {num}
                  </span>
                </div>

                <div style={{ color: "var(--sauge)", opacity: 0.7 }}>
                  {icon}
                </div>

                <p style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 900, fontSize: 16, lineHeight: 1.1,
                  color: "var(--text-primary)", letterSpacing: "0.02em",
                }}>
                  {title}
                </p>

                <p style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: 12, color: "var(--text-muted)",
                  lineHeight: 1.55, flex: 1,
                }}>
                  {desc}
                </p>

                <span style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  color: "var(--text-faint)", marginTop: 4,
                }}>
                  {cta}
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}
