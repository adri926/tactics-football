import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getClubPlan } from "@/app/dashboard/club/actions"
import PageHeader from "@/components/dashboard/PageHeader"
import UpgradeButton from "@/components/dashboard/UpgradeButton"

const PLANS = [
  {
    id: "amateur",
    label: "Amateur",
    price: "Gratuit",
    features: [
      "1 coach",
      "Effectif illimité",
      "Matchs & entraînements",
      "Digiboard tactique",
      "Convocations email + push",
      "Espace joueur",
      "Analyse vidéo IA",
    ],
  },
  {
    id: "semi_pro",
    label: "Semi-pro",
    price: "9€ / mois",
    features: [
      "Tout du plan Amateur",
      "Multi-coachs (staff illimité)",
      "Rôles & permissions (admin, adjoint…)",
      "Gestion multi-équipes avancée",
      "Support prioritaire",
    ],
  },
]

export default async function AbonnementPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const plan     = await getClubPlan()
  const isPaying = plan !== "amateur"
  const stripe   = !!process.env.STRIPE_SECRET_KEY
  const planLabel = plan === "amateur" ? "Amateur" : plan === "semi_pro" ? "Semi-pro" : "Pro"

  return (
    <div className="page-pad" style={{ maxWidth: 760 }}>
      <PageHeader
        label="Paramètres"
        title="Abonnement"
        subtitle={`Plan actuel : ${planLabel}`}
      />

      <div className="grid-2" style={{ gap: 16, marginBottom: 32 }}>
        {PLANS.map(p => {
          const active = p.id === plan
          return (
            <div key={p.id} style={{
              padding: "22px 24px", borderRadius: 14,
              backgroundColor: active ? "rgba(122,154,130,0.08)" : "var(--bg-card)",
              border: `1px solid ${active ? "rgba(122,154,130,0.4)" : "rgba(122,154,130,0.1)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <p style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 900, fontSize: 20, color: "rgba(255,255,255,0.9)",
                }}>
                  {p.label}
                </p>
                {active && (
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                    color: "#7A9A82", backgroundColor: "rgba(122,154,130,0.12)",
                    border: "1px solid rgba(122,154,130,0.3)",
                    padding: "2px 8px", borderRadius: 100,
                  }}>
                    ACTIF
                  </span>
                )}
              </div>
              <p style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 14, fontWeight: 700, color: active ? "#7A9A82" : "rgba(255,255,255,0.5)",
                marginBottom: 16,
              }}>
                {p.price}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {p.features.map(f => (
                  <li key={f} style={{
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: 13, color: "rgba(255,255,255,0.6)",
                    paddingLeft: 16, position: "relative",
                  }}>
                    <span style={{ position: "absolute", left: 0, color: "#7A9A82" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {!isPaying && (
        <div style={{
          padding: "20px 24px", borderRadius: 12,
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(122,154,130,0.12)",
          marginBottom: 16,
        }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
            color: "rgba(122,154,130,0.5)", textTransform: "uppercase", marginBottom: 10,
          }}>
            Passer à un plan payant
          </p>
          {stripe ? (
            <UpgradeButton />
          ) : (
            <p style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 13, color: "rgba(255,255,255,0.3)",
            }}>
              Paiement bientôt disponible.
            </p>
          )}
        </div>
      )}

      {isPaying && (
        <p style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
        }}>
          Pour gérer ou annuler ton abonnement, contacte-nous à <a href="mailto:adrisim926@gmail.com" style={{ color: "#7A9A82" }}>adrisim926@gmail.com</a>.
        </p>
      )}
    </div>
  )
}
