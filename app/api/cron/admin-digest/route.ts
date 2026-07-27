// [Backoffice — Phase 0] Digest hebdo (lundi) → email Resend à l'owner. Déclenché par le cron
// Vercel (vercel.json), protégé par CRON_SECRET. Pas d'email client. S'active au déploiement Vercel.
import { NextResponse } from "next/server"
import { resend, hasEmailKey, FROM, adminDigestTemplate } from "@/lib/email"
import { getOverviewMetrics, getWeeklyDigest } from "@/lib/admin-data"

export const dynamic = "force-dynamic"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true // Vercel Cron envoie ce header
  const url = new URL(req.url)
  return url.searchParams.get("secret") === secret
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 })
  }

  const [metrics, week] = await Promise.all([getOverviewMetrics(), getWeeklyDigest()])

  const now = new Date()
  const weekLabel = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://footboard.fr"

  const { subject, html } = adminDigestTemplate({
    weekLabel,
    signups: week.signups,
    mrr: metrics.mrr,
    arr: metrics.arr,
    churn30d: metrics.churn30d,
    blockedCount: week.blockedCount,
    aiCostWeek: week.aiCostWeek,
    aiMinutesWeek: week.aiMinutesWeek,
    toContactUrl: `${baseUrl}/admin/a-contacter`,
  })

  const to = process.env.ADMIN_DIGEST_TO ?? "adrisim926@gmail.com"

  if (!resend || !hasEmailKey()) {
    // Pas de clé Resend (ex: preview) : on renvoie l'agrégat sans envoyer, pour ne pas planter le cron.
    return NextResponse.json({ ok: true, sent: false, reason: "Resend non configuré", preview: { subject, to } })
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Échec d'envoi" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: true, to })
}
