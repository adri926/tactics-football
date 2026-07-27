import { describe, it, expect } from "vitest"
import { trackingFramesToPlayerPositions, framesAtTimestamp } from "@/lib/tracking/replay"
import type { TrackingFrame } from "@/lib/tracking/types"

const frames: TrackingFrame[] = [
  { playerId: "p1", team: "A", timestampMs: 0,    x: 10, y: 20, dirX: 0, dirY: 1, speed: 5 },
  { playerId: "p2", team: "B", timestampMs: 0,    x: 50, y: 60, dirX: 0, dirY: -1, speed: 4 },
  { playerId: "p1", team: "A", timestampMs: 1000, x: 12, y: 22 },
  { playerId: null, team: "B", timestampMs: 1000, x: 52, y: 58 },
]

describe("trackingFramesToPlayerPositions", () => {
  it("convertit chaque frame en PlayerPosition compatible avec le moteur de pitch control", () => {
    const positions = trackingFramesToPlayerPositions(frames.slice(0, 2))
    expect(positions).toEqual([
      { id: "p1", x: 10, y: 20, team: "A", dirX: 0, dirY: 1, speed: 5 },
      { id: "p2", x: 50, y: 60, team: "B", dirX: 0, dirY: -1, speed: 4 },
    ])
  })

  it("génère un id synthétique quand playerId est null (vision sans reconnaissance)", () => {
    const [pos] = trackingFramesToPlayerPositions([frames[3]])
    expect(pos.id).toBe("frame-1000-B-52-58")
  })
})

describe("framesAtTimestamp", () => {
  it("isole les frames de l'instant le plus proche dans la tolérance", () => {
    const result = framesAtTimestamp(frames, 50, 200)
    expect(result).toHaveLength(2)
    expect(result.every(f => f.timestampMs === 0)).toBe(true)
  })

  it("renvoie un tableau vide si rien n'est dans la tolérance", () => {
    expect(framesAtTimestamp(frames, 5000, 200)).toEqual([])
  })
})
