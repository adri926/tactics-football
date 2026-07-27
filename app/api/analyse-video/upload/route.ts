import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"
import { getClubScope } from "@/lib/scope"
import { checkVideoAnalysisQuota } from "@/lib/rate-limit"
import { logUsage } from "@/lib/usage"
import { analyzeVideo } from "@/app/tactique/analyse-video/actions"

const BUCKET = "match-videos"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Connecte-toi pour uploader une vidéo." }, { status: 401 })
  }
  const scope = await getClubScope()

  const formData = await req.formData()
  const file = formData.get("video")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Sélectionne un fichier vidéo." }, { status: 400 })
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ ok: false, error: "Le fichier doit être une vidéo." }, { status: 400 })
  }
  if (file.size > 500 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Vidéo trop lourde — max 500 Mo." }, { status: 400 })
  }

  const title = (formData.get("title") as string | null)?.trim() || "Match"
  const matchIdRaw = (formData.get("matchId") as string | null)?.trim() || null
  const matchId = matchIdRaw && /^[0-9a-f-]{36}$/.test(matchIdRaw) ? matchIdRaw : null
  const aiRequested = formData.get("aiRequested") === "on"
  // Durée captée côté client (video.duration) — sert au coût IA et au quota hebdo en minutes.
  const durationSec = Math.max(0, Math.round(Number(formData.get("durationSec")) || 0))
  const durationMin = durationSec / 60

  // club_id du compte : plan_limits / account_overrides sont indexés par club_id.
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq(scope.column, scope.value)
    .maybeSingle()
  const clubId = (club?.id as string | undefined) ?? null

  // [Backoffice — Phase 0] Garde-fou coût Gemini : quota hebdo en minutes/semaine par plan,
  // seulement pour les analyses IA. (Le suivi du coût démarre dès que la feature existe.)
  if (aiRequested && clubId) {
    const quota = await checkVideoAnalysisQuota(scope, clubId, durationMin)
    if (!quota.ok) {
      await logUsage({
        clubId, userId: scope.userId, eventType: "video_analysis_blocked",
        metadata: { duration_seconds: durationSec, used_minutes: quota.used, limit_minutes: quota.limit },
      })
      return NextResponse.json({ ok: false, error: quota.error }, { status: 429 })
    }
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4"
  const path = `${scope.value}/${Date.now()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ ok: false, error: "Erreur lors de l'upload. Réessaie." }, { status: 500 })
  }

  const { data: row, error: insertError } = await supabase
    .from("video_analyses")
    .insert({
      owner_id: scope.userId,
      org_id: scope.orgId,
      title,
      match_id: matchId,
      video_path: path,
      status: aiRequested ? "processing" : "ready",
      ai_requested: aiRequested,
      duration_sec: durationSec || null,
    })
    .select("id")
    .single()

  if (insertError || !row) {
    return NextResponse.json({ ok: false, error: "Erreur d'enregistrement. Réessaie." }, { status: 500 })
  }

  // Mode manuel (aiRequested = false) : la vidéo est déjà "ready", rien à traiter — pas
  // d'appel Gemini, pas d'attente, le coach peut directement l'annoter.
  if (aiRequested) {
    // Lance l'analyse — erreurs gérées et stockées sur la ligne (pas de retry auto en V1)
    analyzeVideo(row.id, buffer, file.type, scope.userId, title, matchId).catch(async (err: unknown) => {
      await supabase
        .from("video_analyses")
        .update({ status: "error", error_message: String((err as { message?: string })?.message ?? err) })
        .eq("id", row.id)
    })

    // [Backoffice — Phase 0] Coût IA : l'appel Gemini est déclenché → on logge la consommation.
    const costPerMin = Number(process.env.GEMINI_VIDEO_COST_PER_MIN_USD) || 0.02
    await logUsage({
      clubId, userId: scope.userId, eventType: "video_analysis",
      metadata: {
        analysis_id: row.id,
        duration_seconds: durationSec,
        estimated_cost_usd: Number((durationMin * costPerMin).toFixed(4)),
      },
    })
  }

  return NextResponse.json({ ok: true, id: row.id })
}
