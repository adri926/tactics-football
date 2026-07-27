// [Backoffice — Phase 0] Shell du backoffice plateforme, hors du dashboard coach. Accès réservé
// à l'owner (requireAdmin → notFound() pour tout autre user, y compris les org:admin de club).
import type { ReactNode } from "react"
import Link from "next/link"
import { requireAdmin } from "@/lib/admin"
import AdminSidebar from "./AdminSidebar"

export const metadata = { title: "Footboard — Admin", robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex" }}>
      <aside style={{
        width: 240, flexShrink: 0, borderRight: "1px solid rgba(122,154,130,0.13)",
        padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <p style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: 20, color: "var(--text-primary)", margin: 0,
          }}>
            FOOT<span style={{ color: "var(--sauge)" }}>BOARD</span>
          </p>
          <p style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.18em",
            color: "var(--text-faint)", textTransform: "uppercase", margin: "4px 0 0",
          }}>
            Backoffice
          </p>
        </Link>

        <AdminSidebar />

        <Link href="/dashboard" style={{
          marginTop: "auto",
          fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.1em",
          color: "var(--text-faint)", textTransform: "uppercase", textDecoration: "none",
        }}>
          ← Retour à l&apos;app
        </Link>
      </aside>

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1100 }}>
        {children}
      </main>
    </div>
  )
}
