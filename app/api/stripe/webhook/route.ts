import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  // Instanciation paresseuse : ne pas créer le client Stripe au chargement du module
  // (sinon le build échoue quand STRIPE_SECRET_KEY est absente — Stripe non encore activé).
  const secretKey     = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 })
  const stripe = new Stripe(secretKey)

  const body = await req.text()
  const sig  = req.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const clubId  = session.metadata?.club_id
    if (clubId) {
      // [Backoffice — Phase 0] Modèle amateur/semi_pro/pro (le tier 9€ = semi_pro).
      await supabase
        .from("subscriptions")
        .upsert({
          club_id: clubId, plan: "semi_pro", status: "active",
          provider: "stripe",
          provider_subscription_id: session.subscription as string,
          stripe_subscription_id: session.subscription as string,
        }, { onConflict: "club_id" })
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub    = event.data.object as Stripe.Subscription
    const clubId = sub.metadata?.club_id
    if (clubId) {
      await supabase
        .from("subscriptions")
        .update({
          plan: "amateur", status: "canceled",
          canceled_at: new Date().toISOString(),
          provider_subscription_id: null, stripe_subscription_id: null,
        })
        .eq("club_id", clubId)
    }
  }

  return NextResponse.json({ received: true })
}
