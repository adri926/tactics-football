// [Backoffice — Phase 0] Acquisition & activation : d'où viennent les signups et combien passent à
// l'usage réel. Fenêtre 30 jours. Tout vide tant qu'il n'y a pas de signup instrumenté.
import { getAcquisition } from "@/lib/admin-data"
import { AdminHeader, StatCard, EmptyState, Label, CARD } from "../ui"
import { SignupsChart, SourcesChart } from "./AcquisitionCharts"

export const dynamic = "force-dynamic"

export default async function AcquisitionPage() {
  const a = await getAcquisition(30)

  return (
    <>
      <AdminHeader title="Acquisition" subtitle="30 derniers jours — signups, sources et taux d'activation." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Signups (30 j)" value={String(a.totalSignups)} />
        <StatCard label="Activés" value={String(a.activatedCount)} sub="≥ 1 usage réel du produit" />
        <StatCard label="Taux d'activation" value={`${a.activationRate}%`} sub="Activés / signups" />
      </div>

      {a.totalSignups === 0 ? (
        <EmptyState
          title="Aucun signup sur la période"
          hint="Les créations de club instrumentées apparaîtront ici, avec leur source (UTM / referrer) et leur passage à l'usage réel."
        />
      ) : (
        <>
          <div style={{ ...CARD, marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}><Label>Signups par jour</Label></div>
            <SignupsChart data={a.daily} />
          </div>
          <div style={CARD}>
            <div style={{ marginBottom: 12 }}><Label>Par source</Label></div>
            <SourcesChart data={a.bySource} />
          </div>
        </>
      )}
    </>
  )
}
