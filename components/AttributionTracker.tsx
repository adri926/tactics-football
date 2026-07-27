"use client"

// [Backoffice — Phase 0] Capture d'attribution : lit les UTM (query) + le referrer au premier
// contact (landing / sign-up) et pose un cookie `fb_attribution` (30 j). `createClub` le relit à
// l'inscription pour renseigner la source du signup. Ne pose rien si un cookie existe déjà (on
// garde le tout premier point de contact) et ne collecte aucune donnée nominative.
import { useEffect } from "react"

export default function AttributionTracker() {
  useEffect(() => {
    if (document.cookie.split("; ").some(c => c.startsWith("fb_attribution="))) return

    const params = new URLSearchParams(window.location.search)
    const referrer = document.referrer && !document.referrer.includes(window.location.host)
      ? document.referrer
      : null

    const utm = {
      source:   params.get("utm_source"),
      medium:   params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      referrer,
      landing:  window.location.pathname,
    }

    // Rien d'exploitable → ne pas parasiter avec un cookie "direct" vide.
    if (!utm.source && !utm.medium && !utm.campaign && !utm.referrer) return

    const value = encodeURIComponent(JSON.stringify(utm))
    document.cookie = `fb_attribution=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
  }, [])

  return null
}
