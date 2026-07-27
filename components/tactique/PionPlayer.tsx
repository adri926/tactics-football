"use client"

import { useRef } from "react"
import { motion, useMotionValue } from "framer-motion"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"
import type { TacticalTeam } from "@/types/tactical"

const SIZE = 38
const EASE = "cubic-bezier(0.4,0,0.2,1)"
const HANDLE_RADIUS = 26 // distance en px entre le centre du pion et la poignée de direction
const HANDLE_HIT_RADIUS = 9 // rayon de la zone cliquable de la poignée

interface Props {
  id: string
  label: string
  x: number
  y: number
  team: TacticalTeam
  selected?: boolean
  containerRef: RefObject<HTMLDivElement | null>
  onPositionUpdate: (id: string, x: number, y: number) => void
  showDirectionHandle?: boolean
  dirX?: number
  dirY?: number
  onDirectionUpdate?: (id: string, dirX: number, dirY: number) => void
}

// Pion draggable à la souris et au doigt (Framer Motion gère les deux nativement)
// — équipe A en vert sauge, équipe B en rouge, dans la charte Footboard
export default function PionPlayer({
  id, label, x, y, team, selected, containerRef, onPositionUpdate,
  showDirectionHandle, dirX, dirY, onDirectionUpdate,
}: Props) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const pionRef = useRef<HTMLDivElement>(null)

  const colors = team === "A"
    ? {
        bg:     "#2e3e31",
        border: "rgba(122,154,130,0.6)",
        active: "rgba(180,220,190,0.95)",
        glow:   "rgba(122,154,130,0.45)",
        text:   "#7A9A82",
      }
    : {
        bg:     "#5a2c1d",
        border: "rgba(224,112,80,0.65)",
        active: "rgba(255,170,140,0.95)",
        glow:   "rgba(224,112,80,0.45)",
        text:   "#e07050",
      }

  // Direction par défaut si aucune n'a encore été réglée : vers le but adverse
  // (équipe A attaque vers y croissant, équipe B vers y décroissant — cf. lib/formations.ts)
  const angleDirX = dirX ?? 0
  const angleDirY = dirY ?? (team === "A" ? 1 : -1)
  const angle = Math.atan2(angleDirY, angleDirX)
  const handleX = Math.cos(angle) * HANDLE_RADIUS
  const handleY = Math.sin(angle) * HANDLE_RADIUS

  // Poignée de direction — mécanique "joystick" : l'angle suit le pointeur,
  // la distance au centre reste fixe (HANDLE_RADIUS). Le pointeur est capturé
  // sur la poignée elle-même pour ne jamais déclencher le drag de position du pion.
  const handlePointerDown = (e: ReactPointerEvent<SVGCircleElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const updateFromEvent = (clientX: number, clientY: number) => {
      const pion = pionRef.current
      if (!pion || !onDirectionUpdate) return
      const rect = pion.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const a = Math.atan2(clientY - cy, clientX - cx)
      onDirectionUpdate(id, Math.cos(a), Math.sin(a))
    }

    const handleMove = (ev: PointerEvent) => updateFromEvent(ev.clientX, ev.clientY)
    const handleUp = () => {
      target.releasePointerCapture(e.pointerId)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  return (
    <motion.div
      ref={pionRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{
        x: mx, y: my,
        position: "absolute",
        left: `${x}%`, top: `${y}%`,
        marginLeft: -SIZE / 2, marginTop: -SIZE / 2,
        width: SIZE, height: SIZE,
        borderRadius: "50%",
        backgroundColor: colors.bg,
        border: `2px solid ${selected ? colors.active : colors.border}`,
        boxShadow: selected
          ? `0 0 18px ${colors.glow}, 0 0 0 3px rgba(255,255,255,0.16)`
          : `0 0 10px ${colors.glow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: colors.text,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-mono), monospace",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        zIndex: 10,
        transition: `left 320ms ${EASE}, top 320ms ${EASE}`,
      }}
      whileHover={{ scale: 1.12 }}
      whileDrag={{ scale: 1.18, cursor: "grabbing", zIndex: 50 }}
      onDragEnd={(_, info) => {
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const newX = Math.max(2, Math.min(98, ((info.point.x - rect.left) / rect.width) * 100))
        const newY = Math.max(2, Math.min(98, ((info.point.y - rect.top) / rect.height) * 100))
        mx.set(0); my.set(0)
        onPositionUpdate(id, newX, newY)
      }}
    >
      {label}

      {showDirectionHandle && (
        <svg
          width={(HANDLE_RADIUS + HANDLE_HIT_RADIUS) * 2}
          height={(HANDLE_RADIUS + HANDLE_HIT_RADIUS) * 2}
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <g transform={`translate(${HANDLE_RADIUS + HANDLE_HIT_RADIUS}, ${HANDLE_RADIUS + HANDLE_HIT_RADIUS})`}>
            <line x1={0} y1={0} x2={handleX} y2={handleY} stroke={colors.text} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
            <circle
              cx={handleX} cy={handleY} r={HANDLE_HIT_RADIUS}
              fill={colors.bg} stroke={colors.text} strokeWidth={2}
              style={{ cursor: "grab", pointerEvents: "auto", touchAction: "none" }}
              onPointerDownCapture={handlePointerDown}
            />
          </g>
        </svg>
      )}
    </motion.div>
  )
}
