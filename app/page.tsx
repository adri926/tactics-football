import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import AttributionTracker from "@/components/AttributionTracker"
import HeroPitch from "@/components/HeroPitch"
import PricingCard from "@/components/home/PricingCard"
import AiLoopSection from "@/components/home/AiLoopSection"
import DevicesSection from "@/components/home/DevicesSection"
import FaqSection from "@/components/home/FaqSection"

export const metadata: Metadata = {
  title: "Footboard — Analyse vidéo IA, dominez le terrain",
  description: "La plateforme tout-en-un pour les coachs de football amateurs : analyse vidéo par IA, préparation tactique, et gestion complète du club (effectif, matchs, entraînements, convocations). Essayez gratuitement.",
  openGraph: {
    title: "Footboard — Analyse vidéo IA, dominez le terrain",
    description: "La plateforme tout-en-un pour les coachs de football amateurs. Analyse vidéo IA, tactique et gestion de club en un seul endroit.",
    url: "https://footboard.fr",
  },
}

const PILLARS = [
  { icon: "▶", title: "Analyse vidéo IA", desc: "Timeline d'événements et questions sur tes matchs filmés." },
  { icon: "⬡", title: "Terrain tactique", desc: "Digiboard interactif, 16 formations, concepts animés." },
  { icon: "⊞", title: "Gestion de club", desc: "Effectif, matchs, entraînements, convocations et cotisations." },
]

const FEATURES = [
  {
    icon: "▶", tag: "ANALYSE VIDÉO IA", badge: "NOUVEAU",
    title: "Filme un match. Laisse l'IA débriefer.",
    desc: "Upload la vidéo d'un match : l'IA génère une timeline d'événements clés et répond à tes questions sur le match.",
    href: "/tactique/analyse-video", cta: "OUVRIR →", available: true, highlight: true,
  },
  {
    icon: "⬡", tag: "TERRAIN TACTIQUE",
    title: "Construis tes systèmes. Anime tes concepts.",
    desc: "Terrain interactif (Digiboard), 16 formations, concepts et exercices tactiques animés.",
    href: "/tactique", cta: "OUVRIR →", available: true,
  },
  {
    icon: "⊞", tag: "GESTION DE CLUB",
    title: "Ton club. Ton effectif. Tes cotisations.",
    desc: "Gérez l'effectif, planifiez les entraînements, préparez les matchs et suivez les cotisations.",
    href: "/dashboard", cta: "OUVRIR →", available: true,
  },
  {
    icon: "♡", tag: "SANTÉ JOUEURS",
    title: "Suivi médical et charge d'entraînement.",
    desc: "Historique des blessures, charge d'entraînement, statuts en temps réel sur la fiche de chaque joueur.",
    href: "/dashboard/effectif", cta: "OUVRIR →", available: true,
  },
  {
    icon: "▲", tag: "DATA & STATISTIQUES",
    title: "Suis la forme de ton équipe.",
    desc: "Résultats, victoires/nuls/défaites, différence de buts et performance par joueur sur la saison.",
    href: "/dashboard/data", cta: "OUVRIR →", available: true,
  },
]

const STEPS = [
  { n: "01", title: "Créez votre club",       desc: "Renseignez votre effectif, vos joueurs, votre staff. En moins de 5 minutes." },
  { n: "02", title: "Préparez vos matchs",    desc: "Composez votre équipe, définissez votre tactique, rédigez vos consignes." },
  { n: "03", title: "Analysez & progressez",  desc: "Filmez vos matchs, laissez l'IA générer la timeline, suivez les stats et la santé de vos joueurs." },
]

const PLANS = [
  {
    name: "Gratuit", price: "0€", period: "/mois",
    desc: "Pour découvrir et commencer.",
    cta: "COMMENCER GRATUITEMENT",
    features: [
      { label: "Analyse vidéo IA",             included: false },
      { label: "Terrain tactique interactif",  included: true  },
      { label: "5 animations tactiques",       included: true  },
      { label: "Gestion matchs & entraîne.",   included: false },
      { label: "Suivi santé joueurs",          included: false },
      { label: "Data & statistiques avancées", included: false },
    ],
  },
  {
    name: "Coach", price: "9€", period: "/mois",
    desc: "Pour les coachs qui veulent tout.",
    cta: "COMMENCER L'ESSAI GRATUIT",
    featured: true,
    features: [
      { label: "Analyse vidéo IA",             included: true },
      { label: "Terrain tactique interactif",  included: true },
      { label: "Animations illimitées",        included: true },
      { label: "Gestion matchs & entraîne.",   included: true },
      { label: "Suivi santé joueurs",          included: true },
      { label: "Data & statistiques avancées", included: false },
    ],
  },
  {
    name: "Club", price: "29€", period: "/mois",
    desc: "Pour les clubs multi-équipes.",
    cta: "CONTACTER L'ÉQUIPE",
    features: [
      { label: "Analyse vidéo IA",             included: true },
      { label: "Terrain tactique interactif",  included: true },
      { label: "Animations illimitées",        included: true },
      { label: "Gestion matchs & entraîne.",   included: true },
      { label: "Suivi santé joueurs",          included: true },
      { label: "Data & statistiques avancées", included: true },
    ],
  },
]

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Footboard",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  description: "La plateforme tout-en-un pour les coachs de football amateurs : analyse vidéo par IA, préparation tactique, effectif, matchs, entraînements et convocations.",
  url: "https://footboard.fr",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  author: {
    "@type": "Person",
    name: "Adrien Siméon",
  },
}

export default async function Home() {
  // Un utilisateur authentifié ne doit jamais retomber sur la page marketing —
  // surtout en PWA (où le start_url /dashboard peut avoir été mis en cache sur "/"
  // au moment de l'install). On bascule côté serveur vers /dashboard, qui route
  // ensuite coach / joueur / onboarding. Le marketing reste visible pour les
  // visiteurs non connectés (acquisition desktop).
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <main style={{ background: "var(--bg)", color: "rgba(255,255,255,0.92)" }}>
      <AttributionTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <div className="max-w-5xl mx-auto px-6">

        {/* ── 1. HERO ── */}
        <div className="pt-16 pb-20 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 min-w-0">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sauge)", display: "inline-block" }} />
              <span style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                color: "var(--sauge)", background: "var(--sauge-dim)",
                border: "1px solid var(--sauge-border)",
                padding: "2px 8px", borderRadius: 100,
              }}>
                FOOTBOARD · ANALYSE VIDÉO IA
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900, fontSize: "clamp(44px, 7vw, 72px)",
              lineHeight: 0.92, letterSpacing: "-0.01em",
              color: "rgba(255,255,255,0.95)", marginBottom: 20,
            }}>
              L'ANALYSTE VIDÉO<br />
              <span style={{ color: "var(--sauge)" }}>QUE TON CLUB</span><br />
              N'A JAMAIS EU.
            </h1>
            <p style={{
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 400, fontSize: 17, lineHeight: 1.6,
              color: "rgba(255,255,255,0.45)", maxWidth: 400, marginBottom: 32,
            }}>
              Pas de caméra robot, pas de budget pro. Juste ton téléphone (ou ta
              tablette) et une IA qui regarde le match avec toi — plus toute la
              gestion de ton club, dans la même appli.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard" className="transition hover:opacity-85" style={{
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.1em",
                backgroundColor: "var(--sauge)", color: "var(--bg)",
                padding: "13px 26px", borderRadius: 10, display: "inline-block",
              }}>
                COMMENCER GRATUITEMENT →
              </Link>
              <Link href="#comment" className="transition hover:opacity-70" style={{
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.1em",
                border: "1px solid rgba(122,154,130,0.35)",
                color: "rgba(122,154,130,0.75)",
                padding: "13px 26px", borderRadius: 10, display: "inline-block",
              }}>
                VOIR LA DÉMO
              </Link>
            </div>
          </div>

          <div className="shrink-0 w-full max-w-[320px] lg:max-w-none lg:w-[45%] mx-auto lg:mx-0">
            <div className="overflow-hidden rounded-2xl" style={{
              boxShadow: "0 0 60px rgba(122,154,130,0.08), 0 0 0 1px rgba(122,154,130,0.15)",
            }}>
              <HeroPitch />
            </div>
          </div>
        </div>

        {/* ── 2. PILIERS ── */}
        <div className="mb-24 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(122,154,130,0.12)", backgroundColor: "rgba(122,154,130,0.08)" }}>
          {PILLARS.map(({ icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center justify-center py-8 px-4 text-center"
              style={{ backgroundColor: "var(--bg-card)" }}>
              <span style={{
                fontSize: 22, color: "var(--sauge)", marginBottom: 10,
              }}>
                {icon}
              </span>
              <span style={{
                fontFamily: "var(--font-display), system-ui, sans-serif",
                fontWeight: 900, fontSize: 18,
                color: "rgba(255,255,255,0.92)", marginBottom: 6,
              }}>
                {title}
              </span>
              <span style={{
                fontFamily: "var(--font-body), sans-serif",
                fontWeight: 400, fontSize: 13, lineHeight: 1.5,
                color: "rgba(255,255,255,0.4)",
              }}>
                {desc}
              </span>
            </div>
          ))}
        </div>

        {/* ── 2bis. LA BOUCLE IA (différenciateur) ── */}
        <AiLoopSection />

        {/* ── 3. FONCTIONNALITÉS ── */}
        <div className="mb-24">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sauge)", display: "inline-block" }} />
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "var(--sauge)", background: "var(--sauge-dim)",
              border: "1px solid var(--sauge-border)",
              padding: "2px 8px", borderRadius: 100,
            }}>TOUT CE DONT TU AS BESOIN</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 0.95, color: "rgba(255,255,255,0.95)",
            textAlign: "center", marginBottom: 40,
          }}>
            UNE PLATEFORME,<br />
            <span style={{ color: "var(--sauge)" }}>TOUTES LES FONCTIONS.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <div key={f.tag} className={`flex flex-col gap-4 p-5 rounded-2xl${f.highlight ? " sm:col-span-2" : ""}`} style={{
                backgroundColor: f.available ? "var(--bg-card)" : "rgba(122,154,130,0.02)",
                border: `1px solid ${f.available ? "var(--sauge-border)" : "rgba(122,154,130,0.07)"}`,
              }}>
                <div className="flex items-center justify-between">
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    color: f.available ? "var(--sauge)" : "rgba(122,154,130,0.3)",
                    background: f.available ? "var(--sauge-dim)" : "transparent",
                    border: f.available ? "1px solid var(--sauge-border)" : "none",
                    padding: f.available ? "2px 8px" : "0", borderRadius: 100,
                  }}>
                    {f.tag}
                  </span>
                  {f.badge && (
                    <span style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
                      backgroundColor: "var(--sauge)",
                      color: "var(--bg)",
                      padding: "2px 8px", borderRadius: 100,
                    }}>{f.badge}</span>
                  )}
                  {!f.available && (
                    <span style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8,
                      backgroundColor: "rgba(122,154,130,0.08)",
                      border: "1px solid rgba(122,154,130,0.15)",
                      color: "rgba(122,154,130,0.4)",
                      padding: "2px 8px", borderRadius: 100,
                    }}>BIENTÔT</span>
                  )}
                </div>
                <div className="flex-1">
                  <p style={{
                    fontFamily: "var(--font-display), system-ui, sans-serif",
                    fontWeight: 900, fontSize: 17,
                    color: f.available ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                    marginBottom: 6,
                  }}>
                    {f.title}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-body), sans-serif",
                    fontWeight: 400, fontSize: 13, lineHeight: 1.5,
                    color: f.available ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)",
                  }}>
                    {f.desc}
                  </p>
                </div>
                {f.available ? (
                  <Link href={f.href} className="transition hover:opacity-70" style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
                    color: "var(--sauge)",
                  }}>
                    {f.cta}
                  </Link>
                ) : (
                  <span style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
                    color: "rgba(122,154,130,0.25)",
                  }}>
                    {f.cta}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. COMMENT ÇA MARCHE ── */}
        <div id="comment" className="mb-24 rounded-2xl p-10" style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(122,154,130,0.13)",
        }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sauge)", display: "inline-block" }} />
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "var(--sauge)", background: "var(--sauge-dim)",
              border: "1px solid var(--sauge-border)",
              padding: "2px 8px", borderRadius: 100,
            }}>SIMPLE ET RAPIDE</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 0.95, color: "rgba(255,255,255,0.95)",
            textAlign: "center", marginBottom: 48,
          }}>
            COMMENT<br />
            <span style={{ color: "var(--sauge)" }}>ÇA MARCHE ?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col gap-4">
                <span style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 900, fontSize: 52, lineHeight: 1,
                  color: "rgba(122,154,130,0.15)", letterSpacing: "-0.02em",
                }}>
                  {n}
                </span>
                <p style={{
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 700, fontSize: 20,
                  color: "rgba(255,255,255,0.9)",
                }}>
                  {title}
                </p>
                <p style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontWeight: 400, fontSize: 13, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.4)",
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. TARIFS ── */}
        <div id="tarifs" className="mb-24">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sauge)", display: "inline-block" }} />
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "var(--sauge)", background: "var(--sauge-dim)",
              border: "1px solid var(--sauge-border)",
              padding: "2px 8px", borderRadius: 100,
            }}>TRANSPARENT ET SANS SURPRISE</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 0.95, color: "rgba(255,255,255,0.95)",
            textAlign: "center", marginBottom: 48,
          }}>
            DES TARIFS POUR<br />
            <span style={{ color: "var(--sauge)" }}>CHAQUE COACH.</span>
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {PLANS.map(plan => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>

        {/* ── 5bis. PARTOUT (mobile · tablette · web) ── */}
        <DevicesSection />

        {/* ── 5ter. FAQ ── */}
        <FaqSection />

        {/* ── 6. CTA FINAL ── */}
        <div className="mb-20 rounded-2xl p-10 text-center" style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(122,154,130,0.18)",
        }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            color: "var(--sauge)", marginBottom: 12,
          }}>
            PRÊT À PASSER AU NIVEAU SUPÉRIEUR ?
          </p>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: "clamp(32px, 5vw, 52px)",
            lineHeight: 0.95, color: "rgba(255,255,255,0.95)", marginBottom: 12,
          }}>
            COMMENÇONS<br />
            <span style={{ color: "var(--sauge)" }}>ENSEMBLE.</span>
          </h2>
          <p style={{
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 400, fontSize: 16, lineHeight: 1.5,
            color: "rgba(255,255,255,0.35)", marginBottom: 32,
          }}>
            Gratuit, sans carte bancaire, sans engagement.
          </p>
          <Link href="/dashboard" className="transition hover:opacity-85" style={{
            fontFamily: "var(--font-mono), monospace",
            fontWeight: 700, fontSize: 11, letterSpacing: "0.1em",
            backgroundColor: "var(--sauge)", color: "var(--bg)",
            padding: "14px 32px", borderRadius: 10, display: "inline-block",
          }}>
            COMMENCER GRATUITEMENT →
          </Link>
        </div>

      </div>
    </main>
  )
}
