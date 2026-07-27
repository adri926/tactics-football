import { describe, it, expect } from "vitest"
import { hashPositions, TACTICAL_TAGS } from "@/lib/tactics/analyze-situation"
import type { Pion } from "@/types/tactical"

const pions: Pion[] = [
  { id: "A1", team: "A", number: 1, x: 20.2, y: 30.4, label: "1" },
  { id: "B1", team: "B", number: 1, x: 60.1, y: 70.6, label: "1" },
]
const ball = { x: 40, y: 50 }

describe("hashPositions", () => {
  it("est stable pour les mêmes positions", () => {
    expect(hashPositions(pions, ball)).toBe(hashPositions(pions, ball))
  })

  it("ne dépend pas de l'ordre des pions", () => {
    expect(hashPositions(pions, ball)).toBe(hashPositions([...pions].reverse(), ball))
  })

  it("absorbe le bruit sous-pixel (arrondi à l'entier)", () => {
    const jittered: Pion[] = pions.map(p => ({ ...p, x: p.x + 0.1, y: p.y - 0.1 }))
    expect(hashPositions(jittered, ball)).toBe(hashPositions(pions, ball))
  })

  it("change si une équipe change", () => {
    const swapped: Pion[] = [{ ...pions[0], team: "B" }, pions[1]]
    expect(hashPositions(swapped, ball)).not.toBe(hashPositions(pions, ball))
  })

  it("change si le ballon bouge significativement", () => {
    expect(hashPositions(pions, { x: 41, y: 50 })).not.toBe(hashPositions(pions, ball))
  })
})

describe("TACTICAL_TAGS", () => {
  it("reprend le référentiel existant de lib/concepts.ts", () => {
    expect(TACTICAL_TAGS).toEqual([
      "Attaque", "Construction", "Défense", "Possession", "Pressing", "Système", "Transition",
    ])
  })
})
