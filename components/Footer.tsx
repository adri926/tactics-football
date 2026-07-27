"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import FootboardMark from "@/components/FootboardMark"

// Hors du contexte app authentifié — même logique que components/Nav.tsx, le
// footer marketing (Tarifs/Blog/Mentions légales...) n'a rien à faire dans le
// shell app et ajoutait un défilement inutile en bas de chaque page. Le cas
// "shell tactique" (digiboard/analyse-video/concepts pour un coach/joueur
// connecté) est couvert par data-marketing-nav, déjà injecté par
// TactiqueShellLayout — on réutilise le même attribut sur le footer.
const HIDE_ON = ["/tactique/digiboard"]
const HIDE_ON_PREFIXES = ["/dashboard", "/joueur", "/admin"]

const COLS = [
  {
    title: "Produit",
    links: [
      { label: "Analyse vidéo",      href: "/tactique/analyse-video", available: true  },
      { label: "Gestion de club",   href: "/dashboard",        available: true  },
      { label: "Santé joueurs",     href: "/dashboard/effectif", available: true  },
      { label: "Data & stats",      href: "/dashboard/data",   available: true  },
      { label: "Tarifs",            href: "/#tarifs",          available: true  },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Blog",        href: "#", available: false },
      { label: "Concepts",    href: "/tactique/concepts", available: true },
      { label: "Tutoriels",   href: "#", available: false },
      { label: "FAQ",         href: "#", available: false },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales",             href: "/mentions-legales",  available: true },
      { label: "CGU",                          href: "/cgu",               available: true },
      { label: "Politique de confidentialité", href: "/confidentialite",   available: true },
    ],
  },
]

const SOCIALS = ["X", "Instagram", "YouTube"]

export default function Footer() {
  const pathname = usePathname()
  if (HIDE_ON.includes(pathname)) return null
  if (HIDE_ON_PREFIXES.some(prefix => pathname.startsWith(prefix))) return null

  return (
    <footer data-marketing-nav style={{
      borderTop: "1px solid rgba(122,154,130,0.12)",
      backgroundColor: "var(--bg)",
      color: "rgba(255,255,255,0.92)",
    }}>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Colonne logo */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" style={{
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900, fontSize: 20, letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.95)",
            }}>
              <FootboardMark size={24} />
              FOOT<span style={{ color: "#7A9A82" }}>BOARD</span>
            </Link>
            <p style={{
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 400, fontSize: 13, lineHeight: 1.6,
              color: "rgba(255,255,255,0.35)", marginTop: 10, maxWidth: 180,
            }}>
              La plateforme des coachs ambitieux.
            </p>
            <div className="flex gap-3 mt-4">
              {SOCIALS.map(s => (
                <Link key={s} href="#" style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
                  color: "rgba(122,154,130,0.45)",
                }}
                className="hover:text-[#7A9A82] transition">
                  {s.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>

          {/* Colonnes liens */}
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                color: "#7A9A82", marginBottom: 14, textTransform: "uppercase",
              }}>
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.available ? l.href : "#"}
                      style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontWeight: 400, fontSize: 13,
                        color: l.available ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                        pointerEvents: l.available ? "auto" : "none",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                      className={l.available ? "hover:text-white transition" : ""}>
                      {l.label}
                      {!l.available && (
                        <span style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: 7, letterSpacing: "0.08em",
                          backgroundColor: "rgba(122,154,130,0.08)",
                          border: "1px solid rgba(122,154,130,0.15)",
                          color: "rgba(122,154,130,0.4)",
                          padding: "1px 5px", borderRadius: 100,
                        }}>
                          BIENTÔT
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
          style={{ borderTop: "1px solid rgba(122,154,130,0.08)" }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.2)",
          }}>
            © FOOTBOARD 2026 — TOUS DROITS RÉSERVÉS
          </p>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.15)",
          }}>
            FAIT AVEC ♥ POUR LES COACHS
          </p>
        </div>
      </div>
    </footer>
  )
}
