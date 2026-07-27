"use client"

import type { AnalyzeResult } from "@/app/tactique/digiboard/tactics-actions"

const PHASES = [
  { value: "", label: "Phase auto (détectée par l'IA)" },
  { value: "build-up", label: "Construction" },
  { value: "transition", label: "Transition" },
  { value: "pressing", label: "Pressing" },
  { value: "set-piece", label: "Coup de pied arrêté" },
]

interface Props {
  status: "idle" | "loading" | "ok" | "error"
  result: AnalyzeResult | null
  error: string
  phaseOfPlay: string
  onPhaseOfPlayChange: (v: string) => void
  onAnalyze: () => void
}

function TagBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
      padding: "3px 8px", borderRadius: 100,
      backgroundColor: "rgba(122,154,130,0.15)", border: "1px solid rgba(122,154,130,0.4)",
      color: "#7A9A82",
    }}>
      {label}
    </span>
  )
}

// Panneau "Analyser cette situation" — appelle Claude (description/tags/principe) + Gemini
// (embedding), déclenchement explicite uniquement (jamais sur auto-save). Une erreur API reste
// locale à ce panneau : le paperboard doit rester utilisable même si l'IA est indisponible.
export default function TacticalAnalysisPanel({
  status, result, error, phaseOfPlay, onPhaseOfPlayChange, onAnalyze,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)" }}>
        Analyse IA
      </p>

      <select
        value={phaseOfPlay}
        onChange={e => onPhaseOfPlayChange(e.target.value)}
        className="w-full text-xs rounded-lg px-2.5 py-2 focus:outline-none"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "rgba(255,255,255,0.7)",
          backgroundColor: "rgba(122,154,130,0.06)",
          border: "1px solid rgba(122,154,130,0.18)",
        }}
      >
        {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      <button
        onClick={onAnalyze}
        disabled={status === "loading"}
        className="text-xs font-bold py-2 rounded-lg transition"
        style={{
          backgroundColor: "rgba(122,154,130,0.18)",
          border: "1px solid rgba(122,154,130,0.4)",
          color: "#7A9A82",
          cursor: status === "loading" ? "default" : "pointer",
          opacity: status === "loading" ? 0.6 : 1,
        }}
      >
        {status === "loading" ? "Analyse en cours…" : "Analyser cette situation"}
      </button>

      {status === "error" && (
        <p className="text-[11px]" style={{ color: "#e07050", fontFamily: "var(--font-mono), monospace" }}>
          {error}
        </p>
      )}

      {status === "ok" && result && (
        <div className="flex flex-col gap-2.5 mt-1">
          <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-body), sans-serif", color: "rgba(255,255,255,0.8)" }}>
            {result.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {result.tags.map(tag => <TagBadge key={tag} label={tag} />)}
          </div>

          {result.principle && (
            <p className="text-[11px] italic" style={{ fontFamily: "var(--font-body), sans-serif", color: "#7A9A82" }}>
              {result.principle}
            </p>
          )}

          {result.cached && (
            <p className="text-[9px]" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(122,154,130,0.4)" }}>
              Déjà analysée précédemment (résultat en cache)
            </p>
          )}

          {result.similar.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                Situations proches
              </p>
              {result.similar.map(s => (
                <div key={s.id} style={{
                  padding: "6px 8px", borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(122,154,130,0.12)",
                }}>
                  <p className="text-[10px]" style={{ fontFamily: "var(--font-body), sans-serif", color: "rgba(255,255,255,0.7)" }}>
                    {s.description}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "rgba(122,154,130,0.4)", marginTop: 2 }}>
                    similarité {(s.similarity * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
