// [Backoffice — Phase 0] Overview : santé financière brute (MRR/ARR/payants/churn). Avant le 1er
// client payant, tout est à 0 — c'est attendu, pas un bug.
import { getOverviewMetrics } from "@/lib/admin-data"
import { AdminHeader, StatCard } from "./ui"

export const dynamic = "force-dynamic"

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)

export default async function AdminOverviewPage() {
  const m = await getOverviewMetrics()

  return (
    <>
      <AdminHeader title="Overview" subtitle="Santé de l'activité — données réelles, mises à jour en direct." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="MRR" value={eur(m.mrr)} sub="Revenu mensuel récurrent" />
        <StatCard label="ARR" value={eur(m.arr)} sub="MRR × 12" />
        <StatCard label="Clients payants" value={String(m.payingCount)} sub={`${m.activeTrialing} comptes actifs/essai`} />
        <StatCard label="Churn (30 j)" value={String(m.churn30d)} sub="Résiliations sur 30 jours" />
      </div>

      {m.payingCount === 0 && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif", fontSize: 13,
          color: "var(--text-faint)", marginTop: 20, lineHeight: 1.6, maxWidth: 520,
        }}>
          Aucun client payant pour l&apos;instant. Les métriques de revenu se rempliront dès la
          première souscription. Concentre-toi sur l&apos;acquisition et l&apos;activation en
          attendant.
        </p>
      )}
    </>
  )
}
