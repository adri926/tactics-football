// Normalisation géométrique d'une situation tactique — avant tout traitement IA (Phase 2.3+),
// pour éviter de payer des appels API sur des situations géométriquement identiques à une
// rotation/symétrie près, et améliorer la qualité du matching sémantique. Opère en % (domaine
// natif du paperboard), avant conversion mètres/API.

import type { Pion, TacticalTeam } from "@/types/tactical"

interface Ball {
  x: number
  y: number
}

interface NormalizedSituation {
  pions: Pion[]
  ball: Ball
  mirrored: boolean
}

function flipVertical(pions: Pion[], ball: Ball): { pions: Pion[]; ball: Ball } {
  return {
    pions: pions.map(p => ({ ...p, y: 100 - p.y, dirY: p.dirY !== undefined ? -p.dirY : undefined })),
    ball: { x: ball.x, y: 100 - ball.y },
  }
}

// Ramène toute situation au même sens d'attaque canonique : l'équipe qui attaque
// (attackingTeam) est toujours considérée comme attaquant vers y croissant — la même
// convention que buildPions()/mirrorY() dans lib/formations.ts pour l'équipe B.
export function canonicalizeAttackDirection(
  pions: Pion[],
  ball: Ball,
  attackingTeam: TacticalTeam,
): NormalizedSituation {
  if (attackingTeam === "A") {
    return { pions, ball, mirrored: false }
  }
  const flipped = flipVertical(pions, ball)
  return { ...flipped, mirrored: true }
}

// Variante symétrique gauche/droite (flip sur l'axe x) — utilisée par la recherche par
// similarité en Phase 2.4 pour matcher des situations en miroir (ex: "sortie de pressing
// côté droit" doit aussi remonter un résultat symétrique côté gauche).
export function mirrorHorizontal(pions: Pion[], ball: Ball): { pions: Pion[]; ball: Ball } {
  return {
    pions: pions.map(p => ({ ...p, x: 100 - p.x, dirX: p.dirX !== undefined ? -p.dirX : undefined })),
    ball: { x: 100 - ball.x, y: ball.y },
  }
}
