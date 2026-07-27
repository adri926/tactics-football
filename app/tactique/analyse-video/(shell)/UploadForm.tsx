"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Match } from "@/app/dashboard/matchs/actions"

function formatMatchLabel(m: Match) {
  const date = new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  return `${date} — ${m.home_away === "home" ? "vs" : "@"} ${m.opponent}`
}

export default function UploadForm(
  { matches, preselectMatchId = null }: { matches: Match[]; preselectMatchId?: string | null }
) {
  // Match présélectionné quand on arrive depuis « Analyser la vidéo de ce match ».
  const preMatch = preselectMatchId ? matches.find(m => m.id === preselectMatchId) ?? null : null

  const [isPending, setIsPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [aiRequested, setAiRequested] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const MAX_SIZE_MB = 500

  // Lit la durée d'une vidéo via un <video> off-screen (pour le coût IA + le quota minutes).
  function readDurationSec(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const v = document.createElement("video")
      v.preload = "metadata"
      const done = (sec: number) => { URL.revokeObjectURL(url); resolve(sec) }
      v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : 0)
      v.onerror = () => done(0)
      v.src = url
    })
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    const file = formData.get("video")
    if (file instanceof File && file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Vidéo trop lourde — max ${MAX_SIZE_MB} Mo.`)
      return
    }

    if (file instanceof File) {
      const durationSec = await readDurationSec(file)
      formData.set("durationSec", String(durationSec))
    }

    setIsPending(true)
    setProgress(0)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/analyse-video/upload")

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      setIsPending(false)
      let res: { ok: true; id: string } | { ok: false; error: string }
      try {
        res = JSON.parse(xhr.responseText)
      } catch {
        setError("Réponse invalide du serveur. Réessaie.")
        return
      }
      if (!res.ok) {
        setError(res.error)
        return
      }
      formRef.current?.reset()
      router.push(`/tactique/analyse-video/${res.id}`)
    }

    xhr.onerror = () => {
      setIsPending(false)
      setError("Erreur réseau pendant l'upload. Réessaie.")
    }

    xhr.send(formData)
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid rgba(122,154,130,0.13)",
        borderRadius: 14,
        padding: "22px 24px",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <p style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 9, letterSpacing: "0.12em",
        color: "var(--sauge)",
      }}>
        NOUVELLE ANALYSE
      </p>

      <input
        name="title"
        type="text"
        placeholder="Titre (ex: AS Poincaré vs FC Rival)"
        defaultValue={preMatch ? `${preMatch.home_away === "home" ? "vs" : "@"} ${preMatch.opponent}` : undefined}
        style={{
          backgroundColor: "var(--bg-input)",
          border: "1px solid rgba(122,154,130,0.18)",
          borderRadius: 8, padding: "10px 12px",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body), sans-serif", fontSize: 13,
        }}
      />

      <input
        name="video"
        type="file"
        accept="video/*"
        required
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11, color: "var(--text-muted)",
        }}
      />

      {matches.length > 0 && (
        <select
          name="matchId"
          defaultValue={preMatch ? preMatch.id : ""}
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid rgba(122,154,130,0.18)",
            borderRadius: 8, padding: "10px 12px",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body), sans-serif", fontSize: 13,
          }}
        >
          <option value="">Lier à un match (optionnel)</option>
          {matches.map(m => (
            <option key={m.id} value={m.id}>{formatMatchLabel(m)}</option>
          ))}
        </select>
      )}

      <p style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5,
      }}>
        L&apos;analyse génère une timeline d&apos;événements et permet de poser des questions sur
        le match à tout moment.
      </p>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        fontFamily: "var(--font-body), sans-serif", fontSize: 12, color: "var(--text-muted)",
        cursor: "pointer",
      }}>
        <input
          type="checkbox"
          name="aiRequested"
          checked={aiRequested}
          onChange={e => setAiRequested(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          Analyse IA automatique (résumé + timeline d&apos;événements).
          Décoche pour annoter manuellement sans IA — gratuit, vidéo disponible immédiatement.
        </span>
      </label>

      {error && (
        <p style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, color: "rgba(220,80,80,0.8)",
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          alignSelf: "flex-start",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          color: "var(--sauge)",
          backgroundColor: "var(--sauge-dim)",
          border: "1px solid var(--sauge-border)",
          borderRadius: 8, padding: "10px 18px",
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? `UPLOAD EN COURS... ${progress}%` : aiRequested ? "UPLOADER ET ANALYSER →" : "UPLOADER →"}
      </button>

      {isPending && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            height: 4, borderRadius: 100, overflow: "hidden",
            backgroundColor: "rgba(122,154,130,0.15)",
          }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              backgroundColor: "var(--sauge)",
              transition: "width 0.15s ease",
            }} />
          </div>
          <p style={{
            marginTop: 8,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6, opacity: 0.6,
          }}>
            {aiRequested
              ? "Ne ferme pas cette page. L'analyse IA démarrera automatiquement après l'upload."
              : "Ne ferme pas cette page. La vidéo sera prête à annoter dès la fin de l'upload."}
          </p>
        </div>
      )}
    </form>
  )
}
