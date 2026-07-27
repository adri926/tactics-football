"use client"

import type { OverloadZone } from "@/lib/tactics/pitch-control"

interface Props {
  surface: { teamA: number; teamB: number } | null
  zones: OverloadZone[]
}

// Panneau de métriques dérivées du pitch control — % de surface contrôlée par équipe
// et zones de surnombre. Accessible à tous pour l'instant (pas de gating tier).
export default function PitchControlPanel({ surface, zones }: Props) {
  const overloaded = zones.filter(z => Math.abs(z.imbalance) >= 2)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)" }}>
        Pitch control
      </p>

      {surface && (
        <div>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${surface.teamA}%`, backgroundColor: "#7A9A82" }} />
            <div style={{ width: `${surface.teamB}%`, backgroundColor: "#e07050" }} />
          </div>
          <div className="flex justify-between mt-1.5" style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10 }}>
            <span style={{ color: "#7A9A82" }}>A · {surface.teamA.toFixed(0)}%</span>
            <span style={{ color: "#e07050" }}>B · {surface.teamB.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {overloaded.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
            Surnombre détecté
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overloaded.map(z => (
              <span
                key={`${z.col}-${z.row}`}
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 9, fontWeight: 700,
                  padding: "3px 7px", borderRadius: 100,
                  backgroundColor: z.imbalance > 0 ? "rgba(122,154,130,0.15)" : "rgba(224,112,80,0.15)",
                  border: `1px solid ${z.imbalance > 0 ? "rgba(122,154,130,0.4)" : "rgba(224,112,80,0.4)"}`,
                  color: z.imbalance > 0 ? "#7A9A82" : "#e07050",
                }}
              >
                {z.imbalance > 0 ? "A" : "B"} +{Math.abs(z.imbalance)} zone ({z.col + 1},{z.row + 1})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
