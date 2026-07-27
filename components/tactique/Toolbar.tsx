"use client"

import type { ReactNode } from "react"
import type { Tool } from "./DrawingCanvas"

interface Props {
  tool: Tool
  onToolChange: (t: Tool) => void
  color: string
  onColorChange: (c: string) => void
  thickness: number
  onThicknessChange: (t: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  showPitchControl?: boolean
  onTogglePitchControl?: () => void
}

const STROKE_COLORS = ["#7A9A82", "#e07050", "#e8c468", "#5b8ec4", "#ffffff"]
const THICKNESSES = [2, 4, 6]

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const TOOL_ICONS: Record<Tool, ReactNode> = {
  curseur:          <path d="M5 3l14 7-6 1.5L11 18z" />,
  fleche:           <><path d="M4 18L17 5" /><path d="M9 5h8v8" /></>,
  "fleche-tirets":  <><path d="M4 18L17 5" strokeDasharray="3 2.5" /><path d="M9 5h8v8" /></>,
  "fleche-courbe":  <><path d="M4 19c2-9 9-13 15-12" /><path d="M14 5l5 2-2 5" /></>,
  crayon:           <><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" /><path d="M14.5 6.5l3 3" /></>,
  zone:             <ellipse cx="12" cy="12" rx="8" ry="5.5" />,
  texte:            <><path d="M5 6h14" /><path d="M12 6v13" /></>,
  gomme:            <><path d="M16 4 6 14l5 5h4l7-7-6-6z" /><path d="M11 19H6" /></>,
}

const TOOL_LABELS: Record<Tool, string> = {
  curseur:         "Curseur — déplacer les pions",
  fleche:          "Flèche simple",
  "fleche-tirets": "Flèche en tirets",
  "fleche-courbe": "Flèche courbe",
  crayon:          "Crayon (tracé libre)",
  zone:            "Zone ovale",
  texte:           "Texte",
  gomme:           "Gomme — supprimer un tracé",
}

const TOOLS: Tool[] = ["curseur", "fleche", "fleche-tirets", "fleche-courbe", "crayon", "zone", "texte", "gomme"]

function ToolButton({ tool, active, onClick }: { tool: Tool; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={TOOL_LABELS[tool]}
      aria-label={TOOL_LABELS[tool]}
      className="w-11 h-11 rounded-xl flex items-center justify-center transition"
      style={{
        backgroundColor: active ? "rgba(122,154,130,0.22)" : "transparent",
        border: `1px solid ${active ? "rgba(122,154,130,0.5)" : "transparent"}`,
        color: active ? "#7A9A82" : "rgba(255,255,255,0.55)",
      }}
    >
      <Icon>{TOOL_ICONS[tool]}</Icon>
    </button>
  )
}

function Sep() {
  return <div style={{ width: 1, alignSelf: "stretch", backgroundColor: "rgba(122,154,130,0.15)", margin: "4px 6px" }} />
}

// Barre d'outils — sélection de l'outil de dessin, couleur et épaisseur du trait,
// undo/redo et effacement, dans la charte Footboard. Le positionnement (au-dessus
// du terrain, hors du cadre) est géré par le parent pour ne jamais couvrir la pelouse.
//
// Le conteneur extérieur porte le scroll horizontal (overflow-x) : sur mobile, la barre
// contient trop de boutons pour tenir dans la largeur de l'écran, donc plutôt que de la
// laisser déborder et se faire rogner par l'ancêtre `overflow-hidden` (illisible ET
// inaccessible), elle devient défilable au doigt. Le conteneur intérieur (width: max-content)
// empêche les boutons de se comprimer au lieu de faire défiler.
export default function Toolbar({
  tool, onToolChange, color, onColorChange, thickness, onThicknessChange,
  canUndo, canRedo, onUndo, onRedo, onClear,
  showPitchControl, onTogglePitchControl,
}: Props) {
  return (
    <div
      className="rounded-2xl digiboard-toolbar-scroll"
      style={{
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "rgba(24,22,18,0.88)",
        border: "1px solid rgba(122,154,130,0.18)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5" style={{ width: "max-content" }}>
        {TOOLS.map(t => (
          <ToolButton key={t} tool={t} active={tool === t} onClick={() => onToolChange(t)} />
        ))}

        <Sep />

        <div className="flex items-center gap-1.5 px-1.5">
          {STROKE_COLORS.map(c => (
            <button key={c} onClick={() => onColorChange(c)} title={c}
              className="rounded-full transition"
              style={{
                width: 22, height: 22, borderRadius: "50%",
                backgroundColor: c,
                border: color === c ? "2.5px solid rgba(255,255,255,0.9)" : "2.5px solid transparent",
                boxShadow: color === c ? "0 0 0 1px rgba(0,0,0,0.4)" : undefined,
              }} />
          ))}
        </div>

        <Sep />

        <div className="flex items-center gap-1.5 px-1">
          {THICKNESSES.map((t, i) => (
            <button key={t} onClick={() => onThicknessChange(t)} title={`Épaisseur ${i + 1}`}
              className="w-9 h-11 rounded-lg flex items-center justify-center transition"
              style={{
                backgroundColor: thickness === t ? "rgba(122,154,130,0.22)" : "transparent",
                border: `1px solid ${thickness === t ? "rgba(122,154,130,0.5)" : "transparent"}`,
              }}>
              <span style={{
                display: "block", borderRadius: "50%",
                width: 6 + i * 4, height: 6 + i * 4,
                backgroundColor: thickness === t ? "#7A9A82" : "rgba(255,255,255,0.45)",
              }} />
            </button>
          ))}
        </div>

        <Sep />

        <button onClick={onUndo} disabled={!canUndo} title="Annuler" aria-label="Annuler"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition"
          style={{ color: canUndo ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", cursor: canUndo ? "pointer" : "default" }}>
          <Icon><path d="M7 7L3 11l4 4M3 11h11a6 6 0 010 12h-3" /></Icon>
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Rétablir" aria-label="Rétablir"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition"
          style={{ color: canRedo ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", cursor: canRedo ? "pointer" : "default" }}>
          <Icon><path d="M17 7l4 4-4 4M21 11H10a6 6 0 000 12h3" /></Icon>
        </button>

        <Sep />

        <button onClick={onClear} title="Effacer tous les tracés" aria-label="Effacer tous les tracés"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition"
          style={{ color: "rgba(224,112,80,0.75)" }}>
          <Icon><><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></></Icon>
        </button>

        {onTogglePitchControl && (
          <>
            <Sep />
            <button
              onClick={onTogglePitchControl}
              title="Pitch control — heatmap de contrôle territorial"
              aria-label="Activer/désactiver le pitch control"
              aria-pressed={showPitchControl}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition"
              style={{
                backgroundColor: showPitchControl ? "rgba(122,154,130,0.22)" : "transparent",
                border: `1px solid ${showPitchControl ? "rgba(122,154,130,0.5)" : "transparent"}`,
                color: showPitchControl ? "#7A9A82" : "rgba(255,255,255,0.55)",
              }}
            >
              <Icon>
                <>
                  <path d="M4 12h4l2-6 4 12 2-6h4" />
                </>
              </Icon>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
