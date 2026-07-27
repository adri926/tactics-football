// [Backoffice — Phase 0] Briques visuelles partagées des écrans admin (design system Footboard).
import type { CSSProperties, ReactNode } from "react"

export const CARD: CSSProperties = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid rgba(122,154,130,0.13)",
  borderRadius: 12,
  padding: "20px 22px",
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-mono), monospace",
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      color: "rgba(122,154,130,0.6)", textTransform: "uppercase", margin: 0,
    }}>
      {children}
    </p>
  )
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={CARD}>
      <Label>{label}</Label>
      <p style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 30, fontWeight: 700, color: "var(--text-primary)",
        margin: "10px 0 0", lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif", fontSize: 12,
          color: "var(--text-faint)", margin: "6px 0 0",
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ ...CARD, textAlign: "center", padding: "40px 28px" }}>
      <p style={{
        fontFamily: "var(--font-display), system-ui, sans-serif",
        fontWeight: 900, fontSize: 18, color: "var(--text-muted)", margin: 0,
      }}>
        {title}
      </p>
      {hint && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif", fontSize: 13,
          color: "var(--text-faint)", margin: "8px auto 0", maxWidth: 380, lineHeight: 1.6,
        }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{
        fontFamily: "var(--font-display), system-ui, sans-serif",
        fontWeight: 900, fontSize: 30, color: "var(--text-primary)",
        margin: 0, letterSpacing: "0.01em",
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif", fontSize: 13,
          color: "var(--text-muted)", margin: "6px 0 0",
        }}>
          {subtitle}
        </p>
      )}
    </header>
  )
}
