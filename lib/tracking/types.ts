// Phase 4 — type canonique partagé avec PlayerPosition (lib/tactics/pitch-control.ts). Principe
// architectural : le moteur de pitch control ne sait jamais si une position vient d'un pion glissé
// à la main, d'un capteur GPS ou d'une caméra — un adaptateur produit toujours ce même type.

export type TrackingSource = "gps_csv" | "video_vision" | "manual_replay"

export interface TrackingFrame {
  playerId: string | null // null si joueur non identifié (ex. vision sans reconnaissance)
  team: "A" | "B"
  timestampMs: number
  x: number // mètres, 0-68 — même repère que PITCH_WIDTH_M
  y: number // mètres, 0-105 — même repère que PITCH_LENGTH_M
  dirX?: number
  dirY?: number
  speed?: number
}

export interface TrackingAdapter<TInput> {
  source: TrackingSource
  parse(input: TInput): TrackingFrame[]
}
