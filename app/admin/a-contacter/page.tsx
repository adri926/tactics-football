// [Backoffice — Phase 0] Liste d'action de la semaine (1er onglet). Regroupe les comptes qui
// méritent un contact : nouveaux signups (<7j), résiliations (30j), limites atteintes, et comptes
// marqués « à recontacter ». Actions inline via AccountActions (chaque mutation → admin_actions).
import { getToContact, type ContactItem } from "@/lib/admin-data"
import { AdminHeader, EmptyState, Label, CARD } from "../ui"
import AccountActions from "../AccountActions"

export const dynamic = "force-dynamic"

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return "hier"
  return `il y a ${days} j`
}

function Section({ title, items }: { title: string; items: ContactItem[] }) {
  if (items.length === 0) return null
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 10 }}><Label>{title} · {items.length}</Label></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={`${it.clubId}-${i}`} style={CARD}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: 16, color: "var(--text-primary)", margin: 0 }}>
                {it.clubName}
              </p>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                {timeAgo(it.at)}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {it.reason} — <span style={{ color: "var(--text-faint)" }}>{it.detail}</span>
            </p>
            <AccountActions clubId={it.clubId} clubName={it.clubName} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function AContacterPage() {
  const { signups, cancellations, blocked, reminders } = await getToContact()
  const total = signups.length + cancellations.length + blocked.length + reminders.length

  return (
    <>
      <AdminHeader title="À contacter cette semaine" subtitle="Les comptes qui méritent une action, du plus chaud au plus froid." />

      {total === 0 ? (
        <EmptyState
          title="Rien à traiter"
          hint="Aucun nouveau signup, résiliation, limite atteinte ou rappel cette semaine. Reviens lundi — le digest hebdo te préviendra."
        />
      ) : (
        <>
          <Section title="Limites atteintes (à convertir)" items={blocked} />
          <Section title="Nouveaux signups (7 j)" items={signups} />
          <Section title="À recontacter" items={reminders} />
          <Section title="Résiliations (30 j)" items={cancellations} />
        </>
      )}
    </>
  )
}
