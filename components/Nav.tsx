"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import InstallPrompt from "./InstallPrompt"

interface NavChild {
  href: string
  label: string
  available: boolean
  badge?: string
}

interface NavItem {
  label: string
  href: string
  children: NavChild[]
  badge?: string
}

const NAV: NavItem[] = [
  { label: "Analyse vidéo IA", href: "/tactique/analyse-video", children: [], badge: "IA" },
  {
    label: "Mon Club",
    href: "/dashboard",
    children: [
      { href: "/dashboard",               label: "Tableau de bord", available: true  },
      { href: "/dashboard/effectif",      label: "Effectif",        available: true  },
      { href: "/dashboard/matchs",        label: "Matchs",          available: true  },
      { href: "/dashboard/entrainements", label: "Entraînements",   available: true  },
    ],
  },
  {
    label: "Tactique",
    href: "/tactique",
    children: [
      { href: "/tactique/digiboard", label: "Digiboard", available: true },
      { href: "/tactique/concepts",  label: "Concepts",  available: true },
    ],
  },
  { label: "Blog",   href: "/blog", children: [] },
  { label: "Tarifs", href: "/#tarifs", children: [] },
]

const HIDE_ON = ["/tactique/digiboard"]
const HIDE_ON_PREFIXES = ["/dashboard", "/joueur", "/admin"]

export default function Nav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  if (HIDE_ON.includes(pathname)) return null
  if (HIDE_ON_PREFIXES.some(prefix => pathname.startsWith(prefix))) return null

  return (
    <>
    <header
      data-marketing-nav
      className="sticky top-0 z-50 flex items-center gap-6 px-6 h-14 border-b"
      style={{
        backgroundColor: "rgba(24,24,18,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(122,154,130,0.12)",
      }}
    >
      {/* Logo */}
      <Link href="/"
        className="shrink-0 hover:opacity-70 transition"
        style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 900, fontSize: 18, letterSpacing: "0.05em",
          color: "rgba(255,255,255,0.95)",
        }}>
        FOOT<span style={{ color: "#7A9A82" }}>BOARD</span>
      </Link>

      {/* Nav principale */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {NAV.map(({ label, href, children, badge }) => {
          const active = href !== "#" && href !== "/#tarifs" && pathname.startsWith(href)
          const hasDropdown = children.length > 0

          return (
            <div key={label} className="relative group">
              <Link href={href}
                className="px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 700, letterSpacing: "0.06em",
                  backgroundColor: active ? "var(--sauge-dim)" : "transparent",
                  color: active ? "var(--sauge)" : "var(--text-muted)",
                  border: active ? "1px solid var(--sauge-border)" : "1px solid transparent",
                }}>
                {label.toUpperCase()}
                {badge && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, letterSpacing: "0.08em",
                    backgroundColor: "rgba(122,154,130,0.12)",
                    border: "1px solid rgba(122,154,130,0.25)",
                    color: "var(--sauge)",
                    padding: "1px 5px", borderRadius: 100,
                  }}>{badge}</span>
                )}
                {hasDropdown && <span className="text-[9px] opacity-40">▾</span>}
              </Link>

              {hasDropdown && (
                <div
                  className="absolute top-full left-0 mt-1.5 py-1.5 rounded-xl min-w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all"
                  style={{
                    backgroundColor: "var(--bg-card-hi)",
                    border: "1px solid rgba(122,154,130,0.18)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {children.map(({ href: ch, label: cl, available, badge }) => (
                    <Link key={ch} href={available ? ch : "#"}
                      className="flex items-center justify-between px-3 py-2 text-xs transition mx-1 rounded-lg"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        letterSpacing: "0.04em",
                        color: pathname === ch ? "var(--sauge)" : available ? "var(--text-primary)" : "var(--text-faint)",
                        backgroundColor: pathname === ch ? "var(--sauge-dim)" : "transparent",
                        pointerEvents: available ? "auto" : "none",
                      }}>
                      <span className="flex items-center gap-1.5">
                        {cl.toUpperCase()}
                        {badge && (
                          <span style={{
                            fontSize: 7, fontWeight: 700, letterSpacing: "0.08em",
                            backgroundColor: "rgba(122,154,130,0.12)",
                            border: "1px solid rgba(122,154,130,0.25)",
                            color: "var(--sauge)",
                            padding: "1px 5px", borderRadius: 100,
                          }}>{badge}</span>
                        )}
                      </span>
                      {!available && (
                        <span style={{
                          fontSize: 7, backgroundColor: "rgba(122,154,130,0.08)",
                          border: "1px solid rgba(122,154,130,0.15)",
                          color: "rgba(122,154,130,0.4)",
                          padding: "1px 5px", borderRadius: 100,
                        }}>BIENTÔT</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <InstallPrompt />

      {/* Hamburger — mobile only */}
      <button
        className="md:hidden ml-auto flex flex-col justify-center"
        onClick={() => setMenuOpen(o => !o)}
        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        style={{
          backgroundColor: "transparent", border: "none", cursor: "pointer",
          padding: 6, color: "rgba(255,255,255,0.7)", gap: 5,
        }}
      >
        <span style={{ display: "block", width: 22, height: 2, backgroundColor: "currentColor", borderRadius: 2, transition: "transform 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
        <span style={{ display: "block", width: 22, height: 2, backgroundColor: "currentColor", borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: "opacity 0.15s" }} />
        <span style={{ display: "block", width: 22, height: 2, backgroundColor: "currentColor", borderRadius: 2, transition: "transform 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
      </button>

    </header>

    {/* Menu mobile overlay */}
    {menuOpen && (
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 56, left: 0, right: 0, bottom: 0, zIndex: 49,
          backgroundColor: "var(--bg)", overflowY: "auto",
          borderTop: "1px solid rgba(122,154,130,0.12)",
        }}
        onClick={e => { if (e.target === e.currentTarget) setMenuOpen(false) }}
      >
        <nav style={{ padding: "8px 16px 32px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(({ label, href, children, badge }) => (
            <div key={label}>
              {children.length === 0 ? (
                <Link href={href} onClick={() => setMenuOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "13px 12px", borderRadius: 10,
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  color: pathname.startsWith(href) && href !== "#" ? "#7A9A82" : "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                }}>
                  {label.toUpperCase()}
                  {badge && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                      backgroundColor: "rgba(122,154,130,0.12)",
                      border: "1px solid rgba(122,154,130,0.25)",
                      color: "var(--sauge)", padding: "1px 5px", borderRadius: 100,
                    }}>{badge}</span>
                  )}
                </Link>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <p style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
                    color: "rgba(122,154,130,0.4)", padding: "0 12px", marginBottom: 4,
                  }}>
                    {label.toUpperCase()}
                  </p>
                  {children.map(({ href: ch, label: cl, available, badge }) => (
                    <Link key={ch} href={available ? ch : "#"} onClick={() => setMenuOpen(false)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 12px", borderRadius: 10,
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: 15, fontWeight: pathname === ch ? 500 : 400,
                      color: pathname === ch ? "#7A9A82" : available ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)",
                      textDecoration: "none",
                      backgroundColor: pathname === ch ? "rgba(122,154,130,0.08)" : "transparent",
                      pointerEvents: available ? "auto" : "none",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {cl}
                        {badge && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                            backgroundColor: "rgba(122,154,130,0.12)",
                            border: "1px solid rgba(122,154,130,0.25)",
                            color: "var(--sauge)", padding: "1px 5px", borderRadius: 100,
                          }}>{badge}</span>
                        )}
                      </span>
                      {!available && (
                        <span style={{ fontSize: 8, color: "rgba(122,154,130,0.4)" }}>BIENTÔT</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    )}
    </>
  )
}
