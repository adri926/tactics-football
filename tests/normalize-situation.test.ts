import { describe, it, expect } from "vitest"
import { canonicalizeAttackDirection, mirrorHorizontal } from "@/lib/tactics/normalize-situation"
import type { Pion } from "@/types/tactical"

const pions: Pion[] = [
  { id: "A1", team: "A", number: 1, x: 20, y: 30, label: "1", dirX: 0, dirY: 1 },
  { id: "B1", team: "B", number: 1, x: 60, y: 70, label: "1", dirX: 0, dirY: -1 },
]
const ball = { x: 40, y: 50 }

describe("canonicalizeAttackDirection", () => {
  it("laisse la situation inchangée quand l'équipe A attaque déjà", () => {
    const result = canonicalizeAttackDirection(pions, ball, "A")
    expect(result.mirrored).toBe(false)
    expect(result.pions).toEqual(pions)
    expect(result.ball).toEqual(ball)
  })

  it("flippe verticalement (pions + ballon + dirY) quand l'équipe B attaque", () => {
    const result = canonicalizeAttackDirection(pions, ball, "B")
    expect(result.mirrored).toBe(true)
    expect(result.ball).toEqual({ x: 40, y: 50 }) // y=50 → 100-50=50, inchangé ici
    expect(result.pions[0].y).toBe(70) // 100 - 30
    expect(result.pions[0].dirY).toBe(-1)
    expect(result.pions[1].y).toBe(30) // 100 - 70
    expect(result.pions[1].dirY).toBe(1)
  })

  it("une situation et sa version pré-flippée normalisent vers le même résultat", () => {
    const alreadyFlipped = canonicalizeAttackDirection(pions, ball, "B").pions
    const reNormalized = canonicalizeAttackDirection(alreadyFlipped, ball, "A")
    expect(reNormalized.pions).toEqual(alreadyFlipped)

    const fromA = canonicalizeAttackDirection(pions, ball, "B")
    expect(fromA.pions.map(p => p.y)).toEqual(alreadyFlipped.map(p => p.y))
  })
})

describe("mirrorHorizontal", () => {
  it("flippe x et dirX, laisse y et dirY inchangés", () => {
    const result = mirrorHorizontal(pions, ball)
    expect(result.pions[0].x).toBe(80) // 100 - 20
    expect(result.pions[0].y).toBe(30)
    expect(Math.abs(result.pions[0].dirX!)).toBe(0) // -0 === 0 en valeur, évite le piège Object.is(-0, 0)
    expect(result.ball.x).toBe(60) // 100 - 40
    expect(result.ball.y).toBe(50)
  })

  it("un double flip horizontal redonne la situation d'origine", () => {
    const once = mirrorHorizontal(pions, ball)
    const twice = mirrorHorizontal(once.pions, once.ball)
    expect(twice.pions).toEqual(pions)
    expect(twice.ball).toEqual(ball)
  })
})
