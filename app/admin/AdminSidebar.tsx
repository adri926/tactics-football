"use client"

// [Backoffice — Phase 0] Navigation du backoffice plateforme. « À contacter » en 1er (liste
// d'action hebdo), puis Overview, puis Acquisition. Design system Footboard (sombre chaud, Space Mono).
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin/a-contacter", label: "À contacter", hint: "Cette semaine" },
  { href: "/admin",            label: "Overview",    hint: "MRR · churn" },
  { href: "/admin/acquisition", label: "Acquisition", hint: "Signups · sources" },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block", padding: "10px 14px", borderRadius: 8,
              textDecoration: "none",
              borderLeft: `2px solid ${active ? "var(--sauge)" : "transparent"}`,
              backgroundColor: active ? "var(--sauge-dim)" : "transparent",
            }}
          >
            <span style={{
              display: "block",
              fontFamily: "var(--font-body), sans-serif", fontSize: 14, fontWeight: 500,
              color: active ? "var(--sauge)" : "var(--text-muted)",
            }}>
              {item.label}
            </span>
            <span style={{
              display: "block", marginTop: 2,
              fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--text-faint)",
            }}>
              {item.hint}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
