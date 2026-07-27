// Seule fonction reliant le monde "tracking" (Phase 4) au moteur de pitch control (Phase 1) —
// computePitchControl ne sait jamais si un PlayerPosition vient d'un pion glissé à la main ou
// d'un capteur réel. Ne jamais faire dépendre lib/tactics/pitch-control.ts de lib/tracking/.
import type { TrackingFrame } from "./types"
import type { PlayerPosition } from "@/lib/tactics/pitch-control"

export function trackingFramesToPlayerPositions(frames: TrackingFrame[]): PlayerPosition[] {
  return frames.map(f => ({
    id: f.playerId ?? `frame-${f.timestampMs}-${f.team}-${f.x}-${f.y}`,
    x: f.x,
    y: f.y,
    team: f.team,
    dirX: f.dirX,
    dirY: f.dirY,
    speed: f.speed,
  }))
}

// Isole les frames d'un instant donné (le plus proche de targetMs, par session) — sert au
// scrubber temporel qui rejoue une tracking_session déjà importée.
export function framesAtTimestamp(frames: TrackingFrame[], targetMs: number, toleranceMs = 200): TrackingFrame[] {
  let closest: number | null = null
  for (const f of frames) {
    const diff = Math.abs(f.timestampMs - targetMs)
    if (diff <= toleranceMs && (closest === null || diff < Math.abs(closest - targetMs))) {
      closest = f.timestampMs
    }
  }
  if (closest === null) return []
  return frames.filter(f => f.timestampMs === closest)
}
