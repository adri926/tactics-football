// Pitch control géométrique — modèle Voronoi pondéré (inspiré Fernandez & Bornn) calculé
// côté client, sans dépendance UI ni modèle entraîné. Ce module ignore volontairement la
// provenance des positions (pion glissé à la main aujourd'hui, tracking réel plus tard) :
// il ne connaît que `PlayerPosition`, réutilisable tel quel le jour où de vraies données de
// vitesse/direction seront disponibles.

export const PITCH_WIDTH_M = 68
export const PITCH_LENGTH_M = 105

const DEFAULT_GRID_RESOLUTION_M = 2
const REACTION_TIME_S = 0.3
const BASE_SPEED_MPS = 6
const DIRECTION_BONUS = 0.3 // vitesse effective ∈ [0.7×, 1.3×] la vitesse de base selon l'alignement au vecteur de direction
const CONTROL_SHARPNESS_S = 0.5 // règle la pente du dégradé de contrôle (tanh)
const CONTROL_THRESHOLD = 0.1 // au-delà, une cellule est comptée comme contrôlée par une équipe

export type TeamId = "A" | "B"

export interface PlayerPosition {
  id: string
  x: number // mètres, 0-68
  y: number // mètres, 0-105
  team: TeamId
  dirX?: number // vecteur unitaire de direction de course (optionnel)
  dirY?: number
  speed?: number // réservé à un usage futur (données de tracking réelles) — ignoré ici
}

export interface PitchControlGrid {
  resolution: number
  cols: number
  rows: number
  values: Float32Array // -1 (contrôle total équipe A) → +1 (contrôle total équipe B), row-major
}

function timeToReach(player: PlayerPosition, px: number, py: number): number {
  const dx = px - player.x
  const dy = py - player.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return REACTION_TIME_S

  let speedFactor = 1
  if (player.dirX !== undefined && player.dirY !== undefined) {
    const dirLen = Math.hypot(player.dirX, player.dirY)
    if (dirLen > 0) {
      const cosAngle = (player.dirX * dx + player.dirY * dy) / (dirLen * dist)
      speedFactor = 1 + DIRECTION_BONUS * cosAngle
    }
  }

  return REACTION_TIME_S + dist / (BASE_SPEED_MPS * speedFactor)
}

function bestTimeForTeam(players: PlayerPosition[], team: TeamId, px: number, py: number): number {
  let best = Infinity
  for (const p of players) {
    if (p.team !== team) continue
    const t = timeToReach(p, px, py)
    if (t < best) best = t
  }
  return best
}

export function computePitchControl(
  players: PlayerPosition[],
  gridResolution: number = DEFAULT_GRID_RESOLUTION_M,
): PitchControlGrid {
  const cols = Math.max(1, Math.ceil(PITCH_WIDTH_M / gridResolution))
  const rows = Math.max(1, Math.ceil(PITCH_LENGTH_M / gridResolution))
  const values = new Float32Array(cols * rows)

  for (let row = 0; row < rows; row++) {
    const py = (row + 0.5) * gridResolution
    for (let col = 0; col < cols; col++) {
      const px = (col + 0.5) * gridResolution
      const tA = bestTimeForTeam(players, "A", px, py)
      const tB = bestTimeForTeam(players, "B", px, py)
      // tA < tB (A plus rapide) → valeur négative, conforme à la convention -1 = contrôle A
      const diff = tA === Infinity && tB === Infinity ? 0 : tA - tB
      values[row * cols + col] = Math.tanh(diff / CONTROL_SHARPNESS_S)
    }
  }

  return { resolution: gridResolution, cols, rows, values }
}

export function surfaceControlPercent(grid: PitchControlGrid): { teamA: number; teamB: number } {
  let countA = 0
  let countB = 0
  for (const v of grid.values) {
    if (v < -CONTROL_THRESHOLD) countA++
    else if (v > CONTROL_THRESHOLD) countB++
  }
  const total = grid.values.length || 1
  return { teamA: (countA / total) * 100, teamB: (countB / total) * 100 }
}

export interface OverloadZone {
  col: number
  row: number
  countA: number
  countB: number
  imbalance: number // countA - countB
}

export function detectOverloadZones(
  players: PlayerPosition[],
  zoneCols: number = 3,
  zoneRows: number = 3,
): OverloadZone[] {
  const zoneW = PITCH_WIDTH_M / zoneCols
  const zoneH = PITCH_LENGTH_M / zoneRows
  const zones: OverloadZone[] = []

  for (let row = 0; row < zoneRows; row++) {
    for (let col = 0; col < zoneCols; col++) {
      const xMin = col * zoneW, xMax = xMin + zoneW
      const yMin = row * zoneH, yMax = yMin + zoneH
      let countA = 0, countB = 0
      for (const p of players) {
        if (p.x < xMin || p.x >= xMax || p.y < yMin || p.y >= yMax) continue
        if (p.team === "A") countA++
        else countB++
      }
      zones.push({ col, row, countA, countB, imbalance: countA - countB })
    }
  }

  return zones
}
