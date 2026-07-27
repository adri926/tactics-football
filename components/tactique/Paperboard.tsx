"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Terrain from "./Terrain"
import PionPlayer from "./PionPlayer"
import BallToken from "@/components/pitch/BallToken"
import FormationPanel from "./FormationPanel"
import DrawingCanvas, { type Tool } from "./DrawingCanvas"
import Toolbar from "./Toolbar"
import PitchControlOverlay from "./PitchControlOverlay"
import PitchControlPanel from "./PitchControlPanel"
import { FORMATIONS, mirrorY } from "@/lib/formations"
import {
  computePitchControl, surfaceControlPercent, detectOverloadZones,
  PITCH_WIDTH_M, PITCH_LENGTH_M,
  type PitchControlGrid, type PlayerPosition, type OverloadZone,
} from "@/lib/tactics/pitch-control"
import { saveTacticalBoard, updateTacticalBoard, createShareLink } from "@/app/tactique/digiboard/actions"
import type { Drawing, Pion, TacticalBoard, TacticalMode, TacticalTeam } from "@/types/tactical"

const PITCH_CONTROL_DEBOUNCE_MS = 180

const DEFAULT_FORMATION_A = "4-3-3"
const DEFAULT_FORMATION_B = "4-4-2"
const DEFAULT_COLOR = "#7A9A82"
const DEFAULT_THICKNESS = 4

// Ordre de priorité d'attribution (les postes les plus "typés" choisissent en premier)
// et numéros traditionnels candidats par poste — ex. 9 = buteur, 7 = ailier droit, 10 = meneur
const POSITION_PRIORITY: Record<string, number> = {
  GB: 0,
  BU: 1, SO: 1,
  MOC: 2,
  AD: 3, MD: 3,
  AG: 4, MG: 4,
  MDC: 5,
  DD: 6, PD: 6,
  DG: 7, PG: 7,
  DC: 8,
  MC: 9,
}

const NUMBER_CANDIDATES: Record<string, number[]> = {
  GB:  [1],
  BU:  [9, 10],
  SO:  [10, 9],
  MOC: [10, 8],
  AD:  [7, 11],
  MD:  [7, 8],
  AG:  [11, 7],
  MG:  [11, 8],
  MDC: [6, 4, 5],
  DD:  [2],
  PD:  [2],
  DG:  [3],
  PG:  [3],
  DC:  [5, 4, 6],
  MC:  [8, 6, 4],
}

// Attribue à chaque joueur un numéro cohérent avec son poste (1 = GB, 9 = buteur, 7 = ailier droit…),
// en traitant d'abord les postes les plus typés pour limiter les collisions sur les formations à 3 milieux
function assignNumbers(players: { name: string }[]): number[] {
  const order = players
    .map((_, i) => i)
    .sort((a, b) => (POSITION_PRIORITY[players[a].name] ?? 9) - (POSITION_PRIORITY[players[b].name] ?? 9))
  const used = new Set<number>()
  const numbers = new Array<number>(players.length)
  for (const i of order) {
    const candidates = NUMBER_CANDIDATES[players[i].name] ?? []
    const pick = candidates.find(n => !used.has(n))
      ?? Array.from({ length: 11 }, (_, n) => n + 1).find(n => !used.has(n))
      ?? 1
    used.add(pick)
    numbers[i] = pick
  }
  return numbers
}

// Place les 11 pions d'une équipe aux positions théoriques d'une formation —
// l'équipe B fait face à l'équipe A (positions retournées verticalement)
function buildPions(formationId: string, team: TacticalTeam): Pion[] {
  const formation = FORMATIONS.find(f => f.id === formationId) ?? FORMATIONS[0]
  const positions = team === "B" ? mirrorY(formation.players) : formation.players
  const numbers = assignNumbers(formation.players)
  return positions.map((p, i) => ({
    id: `${team}${i + 1}`,
    team,
    number: numbers[i],
    x: p.x, y: p.y,
    label: String(numbers[i]),
  }))
}

interface DrawHistory {
  past: Drawing[][]
  present: Drawing[]
  future: Drawing[][]
}

const EMPTY_HISTORY: DrawHistory = { past: [], present: [], future: [] }

const MODES: { id: TacticalMode; label: string }[] = [
  { id: "preparation", label: "Préparation" },
  { id: "direct",      label: "Direct" },
  { id: "analyse",     label: "Analyse" },
]

function BoardsList({ boards, onLoad }: { boards: TacticalBoard[]; onLoad: (b: TacticalBoard) => void }) {
  if (boards.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 24 }}>
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
          Aucun board sauvegardé.
        </p>
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "rgba(122,154,130,0.35)", textAlign: "center" }}>
          Passe en mode ÉDITER pour en créer un.
        </p>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", flex: 1 }}>
      {boards.map(b => (
        <button key={b.id} onClick={() => onLoad(b)} style={{
          display: "flex", flexDirection: "column", gap: 4,
          padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(122,154,130,0.12)",
          transition: "border-color 0.15s",
        }}>
          <p style={{
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 500, fontSize: 13,
            color: "rgba(255,255,255,0.85)", margin: 0,
          }}>
            {b.name}
          </p>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 8, color: "rgba(122,154,130,0.5)",
          }}>
            {b.formation} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}
          </p>
        </button>
      ))}
    </div>
  )
}

interface Props {
  initialBoards?: TacticalBoard[]
}

export default function Paperboard({ initialBoards = [] }: Props) {
  const [formationA, setFormationA] = useState(DEFAULT_FORMATION_A)
  const [formationB, setFormationB] = useState(DEFAULT_FORMATION_B)
  const [editingTeam, setEditingTeam] = useState<TacticalTeam>("A")
  const [pions, setPions] = useState<Pion[]>(() => [
    ...buildPions(DEFAULT_FORMATION_A, "A"),
    ...buildPions(DEFAULT_FORMATION_B, "B"),
  ])
  const [ball, setBall] = useState({ x: 50, y: 50 })
  const [mode, setMode] = useState<TacticalMode>("preparation")

  // Pitch control — désactivé par défaut pour ne pas surcharger l'outil gratuit
  const [showPitchControl, setShowPitchControl] = useState(false)
  const [pitchControlGrid, setPitchControlGrid] = useState<PitchControlGrid | null>(null)
  const [pitchControlSurface, setPitchControlSurface] = useState<{ teamA: number; teamB: number } | null>(null)
  const [pitchControlZones, setPitchControlZones] = useState<OverloadZone[]>([])
  const pitchControlTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Outils de dessin
  const [tool, setTool] = useState<Tool>("curseur")
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [thickness, setThickness] = useState(DEFAULT_THICKNESS)
  const [drawState, setDrawState] = useState<DrawHistory>(EMPTY_HISTORY)

  // Sauvegarde
  const [boardName, setBoardName] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle")
  const [saveError, setSaveError] = useState("")
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null)

  // Auto-save
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "ok">("idle")
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Partage
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle")
  const [isSharing, startShare] = useTransition()

  // Vue sidebar
  const [sidebarView, setSidebarView] = useState<"edit" | "boards">("edit")

  // Panneau latéral repliable + bandeau orientation (mobile uniquement)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [orientationHintDismissed, setOrientationHintDismissed] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const drawings = drawState.present

  useEffect(() => {
    if (!savedBoardId || !boardName.trim()) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving")
      const result = await updateTacticalBoard(savedBoardId, {
        name: boardName.trim(),
        formation: `${formationA} / ${formationB}`,
        pions,
        drawings,
        mode,
      })
      setAutoSaveStatus(result.ok ? "ok" : "idle")
      if (result.ok) setTimeout(() => setAutoSaveStatus("idle"), 2000)
    }, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [savedBoardId, boardName, formationA, formationB, pions, drawings, mode])

  // Recalcul débouncé du pitch control — uniquement quand le toggle est actif,
  // pour ne jamais payer ce coût de calcul dans l'usage gratuit courant du paperboard
  useEffect(() => {
    if (!showPitchControl) {
      setPitchControlGrid(null)
      setPitchControlSurface(null)
      setPitchControlZones([])
      return
    }
    if (pitchControlTimer.current) clearTimeout(pitchControlTimer.current)
    pitchControlTimer.current = setTimeout(() => {
      const players: PlayerPosition[] = pions.map(p => ({
        id: p.id,
        x: (p.x / 100) * PITCH_WIDTH_M,
        y: (p.y / 100) * PITCH_LENGTH_M,
        team: p.team,
        dirX: p.dirX,
        dirY: p.dirY,
      }))
      const grid = computePitchControl(players)
      setPitchControlGrid(grid)
      setPitchControlSurface(surfaceControlPercent(grid))
      setPitchControlZones(detectOverloadZones(players))
    }, PITCH_CONTROL_DEBOUNCE_MS)
    return () => { if (pitchControlTimer.current) clearTimeout(pitchControlTimer.current) }
  }, [showPitchControl, pions])

  const changeFormation = useCallback((team: TacticalTeam, formationId: string) => {
    if (team === "A") setFormationA(formationId)
    else setFormationB(formationId)
    const replacement = buildPions(formationId, team)
    setPions(prev => [...prev.filter(p => p.team !== team), ...replacement])
  }, [])

  const updatePionPosition = useCallback((id: string, x: number, y: number) => {
    setPions(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }, [])

  const updatePionDirection = useCallback((id: string, dirX: number, dirY: number) => {
    setPions(prev => prev.map(p => p.id === id ? { ...p, dirX, dirY } : p))
  }, [])

  const updateBallPosition = useCallback((x: number, y: number) => {
    setBall({ x, y })
  }, [])

  const resetTerrain = useCallback(() => {
    setPions([...buildPions(formationA, "A"), ...buildPions(formationB, "B")])
    setBall({ x: 50, y: 50 })
  }, [formationA, formationB])

  // ── Historique des tracés (undo/redo) ──
  const addDrawing = useCallback((d: Drawing) => {
    setDrawState(s => ({ past: [...s.past, s.present], present: [...s.present, d], future: [] }))
  }, [])

  const eraseDrawing = useCallback((target: Drawing) => {
    setDrawState(s => ({ past: [...s.past, s.present], present: s.present.filter(d => d !== target), future: [] }))
  }, [])

  const undo = useCallback(() => {
    setDrawState(s => {
      if (s.past.length === 0) return s
      const previous = s.past[s.past.length - 1]
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setDrawState(s => {
      if (s.future.length === 0) return s
      const [next, ...rest] = s.future
      return { past: [...s.past, s.present], present: next, future: rest }
    })
  }, [])

  const clearDrawings = useCallback(() => {
    setDrawState(s => s.present.length === 0 ? s : { past: [...s.past, s.present], present: [], future: [] })
  }, [])

  // ── Sauvegarde Supabase ──
  const handleSave = useCallback(async () => {
    if (!boardName.trim()) {
      setSaveStatus("error")
      setSaveError("Donne un nom au paperboard.")
      return
    }
    setSaveStatus("saving")
    const result = await saveTacticalBoard({
      name: boardName.trim(),
      formation: `${formationA} / ${formationB}`,
      pions,
      drawings,
      mode,
    })
    if (result.ok) {
      setSaveStatus("ok")
      setSavedBoardId(result.id)
    } else {
      setSaveStatus("error")
      setSaveError(result.error)
    }
  }, [boardName, formationA, formationB, pions, drawings, mode])

  const loadBoard = useCallback((board: TacticalBoard) => {
    const isDirty = drawings.length > 0 || boardName.trim() !== ""
    if (isDirty && !confirm(`Charger "${board.name}" effacera le board actuel. Continuer ?`)) return

    const [fa, fb] = board.formation.split(" / ")
    if (fa) setFormationA(fa)
    if (fb) setFormationB(fb)
    setPions(board.pions ?? [])
    setDrawState({ past: [], present: board.drawings ?? [], future: [] })
    setMode(board.mode ?? "preparation")
    setBoardName(board.name)
    setSaveStatus("ok")
    setSavedBoardId(board.id ?? null)
    setShareUrl(null)
    setShareStatus("idle")
    setSidebarView("edit")
  }, [drawings.length, boardName])

  const handleShare = useCallback(() => {
    if (!savedBoardId) return
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareStatus("copied")
        setTimeout(() => setShareStatus("idle"), 2000)
      })
      return
    }
    startShare(async () => {
      const result = await createShareLink(savedBoardId)
      if (result.ok) {
        const url = `${window.location.origin}/tactique/digiboard/share/${result.token}`
        setShareUrl(url)
        navigator.clipboard.writeText(url).then(() => {
          setShareStatus("copied")
          setTimeout(() => setShareStatus("idle"), 2000)
        })
      }
    })
  }, [savedBoardId, shareUrl])

  const summary = useMemo(() => `${formationA} contre ${formationB}`, [formationA, formationB])

  return (
    <div className="flex flex-col landscape:flex-row md:flex-row h-screen overflow-hidden" style={{ background: "#181612" }}>
      {/* ── Bandeau orientation (mobile portrait uniquement) ── */}
      {!orientationHintDismissed && (
        <div className="digiboard-orientation-hint" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, padding: "8px 14px",
          backgroundColor: "rgba(122,154,130,0.1)",
          borderBottom: "1px solid rgba(122,154,130,0.18)",
        }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, color: "rgba(122,154,130,0.85)",
          }}>
            ↻ Tourne ton téléphone en paysage pour plus de précision.
          </p>
          <button
            onClick={() => setOrientationHintDismissed(true)}
            aria-label="Fermer"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 14, padding: 4 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Bouton repli/déploi panneau latéral (mobile uniquement) ── */}
      <button
        className="digiboard-sidebar-toggle"
        onClick={() => setMobileSidebarOpen(o => !o)}
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 40,
          alignItems: "center", gap: 6,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          color: "var(--sauge)", backgroundColor: "#1a1a18",
          border: "1px solid rgba(122,154,130,0.3)",
          borderRadius: 100, padding: "10px 16px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {mobileSidebarOpen ? "✕ FERMER" : "☰ OUTILS"}
      </button>

      {/* ── Terrain ── */}
      <main className="flex-1 flex items-center justify-center p-3 md:p-6 overflow-hidden">
        <div className="flex flex-col items-center gap-3 min-w-0 w-full">
          {/* Barre d'outils en flux, au-dessus du cadre — ne couvre jamais la pelouse */}
          <Toolbar
            tool={tool} onToolChange={setTool}
            color={color} onColorChange={setColor}
            thickness={thickness} onThicknessChange={setThickness}
            canUndo={drawState.past.length > 0}
            canRedo={drawState.future.length > 0}
            onUndo={undo} onRedo={redo}
            onClear={clearDrawings}
            showPitchControl={showPitchControl}
            onTogglePitchControl={() => setShowPitchControl(v => !v)}
          />

          <div
            ref={containerRef}
            className={`digiboard-terrain relative rounded-2xl overflow-hidden${mobileSidebarOpen ? "" : " digiboard-terrain-expanded"}`}
            style={{
              boxShadow: "0 0 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
              touchAction: "none",
            }}
          >
            <Terrain />
            {showPitchControl && (
              <PitchControlOverlay grid={pitchControlGrid} containerRef={containerRef} />
            )}
            {pions.map(pion => (
              <PionPlayer
                key={pion.id}
                id={pion.id} label={pion.label}
                x={pion.x} y={pion.y} team={pion.team}
                containerRef={containerRef}
                onPositionUpdate={updatePionPosition}
                showDirectionHandle={showPitchControl}
                dirX={pion.dirX}
                dirY={pion.dirY}
                onDirectionUpdate={updatePionDirection}
              />
            ))}
            <BallToken
              x={ball.x} y={ball.y}
              draggable={true}
              containerRef={containerRef}
              onPositionUpdate={updateBallPosition}
            />
            <DrawingCanvas
              containerRef={containerRef}
              drawings={drawings}
              tool={tool}
              color={color}
              thickness={thickness}
              onAdd={addDrawing}
              onErase={eraseDrawing}
            />
          </div>
        </div>
      </main>

      {/* ── Panneau latéral ── */}
      <aside
        className={`digiboard-sidebar landscape:w-72 md:w-72 landscape:h-full md:h-full shrink-0 flex flex-col gap-4 px-5 py-5 border-t landscape:border-t-0 md:border-t-0 landscape:border-l md:border-l overflow-y-auto${mobileSidebarOpen ? "" : " digiboard-sidebar-hidden"}`}
        style={{ backgroundColor: "#1a1a18", borderColor: "rgba(122,154,130,0.15)" }}
      >
        <div>
          <a href="/tactique"
            className="transition mb-2 inline-block"
            style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, letterSpacing: "0.06em", color: "rgba(122,154,130,0.45)" }}>
            ← TACTIQUE
          </a>
          <h1 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 900, fontSize: 24, letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.92)", lineHeight: 1,
          }}>PAPERBOARD</h1>
          <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.08em", color: "rgba(122,154,130,0.5)", marginTop: 4 }}>
            PLACE · DESSINE · EXPLIQUE
          </p>
        </div>

        {/* Toggle ÉDITER / MES BOARDS */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(122,154,130,0.15)" }}>
          {(["edit", "boards"] as const).map(v => (
            <button key={v} onClick={() => setSidebarView(v)} style={{
              flex: 1, padding: "7px 0", cursor: "pointer", border: "none",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
              backgroundColor: sidebarView === v ? "rgba(122,154,130,0.18)" : "transparent",
              color: sidebarView === v ? "#7A9A82" : "rgba(255,255,255,0.25)",
              transition: "all 0.15s",
            }}>
              {v === "edit" ? "ÉDITER" : `MES BOARDS${initialBoards.length > 0 ? ` (${initialBoards.length})` : ""}`}
            </button>
          ))}
        </div>

        {sidebarView === "boards" ? (
          <BoardsList boards={initialBoards} onLoad={loadBoard} />
        ) : (
          <>

        {/* Sélecteur de mode */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)" }}>
            Mode
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map(m => {
              const active = mode === m.id
              return (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="py-1.5 rounded-lg text-[11px] font-bold transition"
                  style={{
                    backgroundColor: active ? "rgba(122,154,130,0.22)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? "rgba(122,154,130,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: active ? "#7A9A82" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono), monospace",
                  }}>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {showPitchControl && (
          <>
            <PitchControlPanel surface={pitchControlSurface} zones={pitchControlZones} />
            <div style={{ height: 1, backgroundColor: "rgba(122,154,130,0.12)" }} />
          </>
        )}

        <div style={{ height: 1, backgroundColor: "rgba(122,154,130,0.12)" }} />

        {mode === "preparation" ? (
          <>
            <FormationPanel
              team={editingTeam}
              onTeamChange={setEditingTeam}
              formation={editingTeam === "A" ? formationA : formationB}
              onFormationChange={id => changeFormation(editingTeam, id)}
            />
            <button
              onClick={resetTerrain}
              className="text-xs py-2 rounded-lg transition text-gray-500 hover:text-gray-300"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Réinitialiser le terrain
            </button>
          </>
        ) : (
          <div className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.45)" }}>
            <p>Formation en place :</p>
            <p style={{ color: "#7A9A82", marginTop: 2 }}>{summary}</p>
            <p style={{ marginTop: 8 }}>
              {mode === "direct"
                ? "Mode direct : annote en live pendant le match."
                : "Mode analyse : revois et commente la séquence."}
            </p>
          </div>
        )}

        <div style={{ height: 1, backgroundColor: "rgba(122,154,130,0.12)" }} />

        {/* Sauvegarde */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(255,255,255,0.3)" }}>
            Sauvegarder
          </p>
          <input
            value={boardName}
            onChange={e => { setBoardName(e.target.value); setSaveStatus("idle") }}
            placeholder="Nom du paperboard…"
            className="w-full text-xs rounded-lg px-2.5 py-2 focus:outline-none"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "rgba(255,255,255,0.8)",
              backgroundColor: "rgba(122,154,130,0.06)",
              border: "1px solid rgba(122,154,130,0.18)",
            }}
          />
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="text-xs font-bold py-2 rounded-lg transition"
            style={{
              backgroundColor: "rgba(122,154,130,0.18)",
              border: "1px solid rgba(122,154,130,0.4)",
              color: "#7A9A82",
              cursor: saveStatus === "saving" ? "default" : "pointer",
              opacity: saveStatus === "saving" ? 0.6 : 1,
            }}>
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer le paperboard"}
          </button>
          {saveStatus === "ok" && (
            <p className="text-[11px]" style={{ color: "#7A9A82", fontFamily: "var(--font-mono), monospace" }}>
              Paperboard enregistré.
            </p>
          )}
          {autoSaveStatus === "saving" && (
            <p className="text-[10px]" style={{ color: "rgba(122,154,130,0.45)", fontFamily: "var(--font-mono), monospace" }}>
              Auto-sauvegarde…
            </p>
          )}
          {autoSaveStatus === "ok" && (
            <p className="text-[10px]" style={{ color: "rgba(122,154,130,0.45)", fontFamily: "var(--font-mono), monospace" }}>
              ✓ Auto-sauvegardé
            </p>
          )}
          {saveStatus === "error" && (
            <p className="text-[11px]" style={{ color: "#e07050", fontFamily: "var(--font-mono), monospace" }}>
              {saveError}
            </p>
          )}

          {savedBoardId && (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="text-xs font-bold py-2 rounded-lg transition"
              style={{
                marginTop: 4,
                backgroundColor: "transparent",
                border: "1px solid rgba(122,154,130,0.25)",
                color: shareStatus === "copied" ? "#7A9A82" : "rgba(122,154,130,0.6)",
                cursor: isSharing ? "default" : "pointer",
                opacity: isSharing ? 0.6 : 1,
              }}>
              {isSharing ? "…" : shareStatus === "copied" ? "Lien copié ✓" : shareUrl ? "Copier le lien" : "Créer un lien de partage"}
            </button>
          )}
        </div>

          </>
        )}
      </aside>
    </div>
  )
}
