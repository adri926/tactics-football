import { describe, it, expect } from "vitest"
import {
  computePitchControl,
  surfaceControlPercent,
  detectOverloadZones,
  PITCH_WIDTH_M,
  PITCH_LENGTH_M,
  type PlayerPosition,
} from "@/lib/tactics/pitch-control"

describe("computePitchControl", () => {
  it("place la frontière au milieu pour deux joueurs symétriques", () => {
    const players: PlayerPosition[] = [
      { id: "A1", x: PITCH_WIDTH_M / 2, y: PITCH_LENGTH_M / 2 - 20, team: "A" },
      { id: "B1", x: PITCH_WIDTH_M / 2, y: PITCH_LENGTH_M / 2 + 20, team: "B" },
    ]
    const grid = computePitchControl(players, 2)
    const midRow = Math.floor(grid.rows / 2)
    const midCol = Math.floor(grid.cols / 2)
    const midValue = grid.values[midRow * grid.cols + midCol]
    // La grille discrétisée n'a pas forcément une cellule pile sur l'axe de symétrie —
    // on vérifie juste qu'elle reste proche de la neutralité, loin des extrêmes (±1)
    expect(Math.abs(midValue)).toBeLessThan(0.4)

    // côté A (y plus petit) → valeurs négatives ; côté B (y plus grand) → positives
    const nearA = grid.values[Math.floor(grid.rows * 0.2) * grid.cols + midCol]
    const nearB = grid.values[Math.floor(grid.rows * 0.8) * grid.cols + midCol]
    expect(nearA).toBeLessThan(0)
    expect(nearB).toBeGreaterThan(0)
  })

  it("concentre le contrôle d'un joueur très excentré près de lui", () => {
    const players: PlayerPosition[] = [
      { id: "A1", x: 5, y: 5, team: "A" },
      { id: "B1", x: PITCH_WIDTH_M - 5, y: PITCH_LENGTH_M - 5, team: "B" },
    ]
    const grid = computePitchControl(players, 2)
    const cornerA = grid.values[0]
    const cornerB = grid.values[grid.values.length - 1]
    expect(cornerA).toBeLessThan(-0.5)
    expect(cornerB).toBeGreaterThan(0.5)
  })

  it("un vecteur de direction vers un point accélère l'accès à ce point par rapport à l'isotrope", () => {
    const target = { x: 34, y: 80 }
    const withoutDir: PlayerPosition[] = [
      { id: "A1", x: 34, y: 20, team: "A" },
      { id: "B1", x: 60, y: 60, team: "B" },
    ]
    const withDir: PlayerPosition[] = [
      { id: "A1", x: 34, y: 20, team: "A", dirX: 0, dirY: 1 }, // court vers y croissant, donc vers `target`
      { id: "B1", x: 60, y: 60, team: "B" },
    ]
    const gridWithout = computePitchControl(withoutDir, 2)
    const gridWith = computePitchControl(withDir, 2)
    const col = Math.floor(target.x / gridWithout.resolution)
    const row = Math.floor(target.y / gridWithout.resolution)
    const idx = row * gridWithout.cols + col
    // Le contrôle de A sur ce point est renforcé (valeur plus négative) quand A court vers lui
    expect(gridWith.values[idx]).toBeLessThan(gridWithout.values[idx])
  })
})

describe("surfaceControlPercent", () => {
  it("répartit ~50/50 pour une configuration symétrique", () => {
    const players: PlayerPosition[] = [
      { id: "A1", x: PITCH_WIDTH_M / 2, y: PITCH_LENGTH_M / 2 - 20, team: "A" },
      { id: "B1", x: PITCH_WIDTH_M / 2, y: PITCH_LENGTH_M / 2 + 20, team: "B" },
    ]
    const grid = computePitchControl(players, 2)
    const { teamA, teamB } = surfaceControlPercent(grid)
    expect(teamA).toBeGreaterThan(35)
    expect(teamB).toBeGreaterThan(35)
    expect(teamA + teamB).toBeLessThanOrEqual(100)
  })
})

describe("detectOverloadZones", () => {
  it("détecte un surnombre dans la zone où 2 joueurs A font face à 0 joueur B", () => {
    const players: PlayerPosition[] = [
      { id: "A1", x: 5, y: 5, team: "A" },
      { id: "A2", x: 8, y: 8, team: "A" },
      { id: "B1", x: PITCH_WIDTH_M - 5, y: PITCH_LENGTH_M - 5, team: "B" },
    ]
    const zones = detectOverloadZones(players, 3, 3)
    const topLeft = zones.find(z => z.col === 0 && z.row === 0)
    expect(topLeft?.countA).toBe(2)
    expect(topLeft?.countB).toBe(0)
    expect(topLeft?.imbalance).toBe(2)
  })
})
