"use client"

import { useEffect, useRef } from "react"
import type { RefObject } from "react"
import type { PitchControlGrid } from "@/lib/tactics/pitch-control"

interface Props {
  grid: PitchControlGrid | null
  containerRef: RefObject<HTMLDivElement | null>
}

const MAX_ALPHA = 0.55

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace("#", "")
  const n = parseInt(clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Heatmap de pitch control — rendu en <canvas> (plutôt qu'en SVG comme DrawingCanvas.tsx,
// qui reste vectoriel pour les tracés à la main) : un dégradé de ~1800 cellules redessiné à
// chaque recalcul est plus fluide en rasterisant qu'en réconciliant autant de nœuds React.
export default function PitchControlOverlay({ grid, containerRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      draw()
    }

    const draw = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx || !grid) {
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        return
      }

      const styles = getComputedStyle(document.documentElement)
      const red = hexToRgb(styles.getPropertyValue("--red") || "#c0392b")
      const blue = hexToRgb(styles.getPropertyValue("--blue") || "#2d5ea8")

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cellW = canvas.width / grid.cols
      const cellH = canvas.height / grid.rows

      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const value = grid.values[row * grid.cols + col]
          const alpha = Math.min(1, Math.abs(value)) * MAX_ALPHA
          if (alpha < 0.02) continue
          const [r, g, b] = value < 0 ? red : blue
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1)
        }
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    return () => observer.disconnect()
  }, [grid, containerRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: "blur(9px)",
        pointerEvents: "none",
      }}
    />
  )
}
