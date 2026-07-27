// Types du paperboard tactique — schémas dessinés à la main par le coach,
// sauvegardés pour préparer une séance ou analyser un match (table Supabase "tactical_boards")

export type TacticalTeam = "A" | "B"
export type TacticalMode = "preparation" | "direct" | "analyse"

export interface Pion {
  id: string
  team: TacticalTeam
  number: number
  x: number // position sur le terrain, 0-100
  y: number // position sur le terrain, 0-100
  label: string // initiale ou numéro affiché sur le pion
  dirX?: number // vecteur unitaire de direction de course (pitch control), optionnel
  dirY?: number
}

export type DrawingType = "fleche" | "fleche-tirets" | "fleche-courbe" | "crayon" | "zone" | "texte"

export interface Drawing {
  type: DrawingType
  points: { x: number; y: number }[] // 0-100, deux points pour une flèche/zone, une série pour le crayon
  color: string
  thickness: number
  text?: string // contenu pour le type "texte"
}

export interface TacticalBoard {
  id?: string
  coachId: string
  name: string
  formation: string
  pions: Pion[]
  drawings: Drawing[]
  mode: TacticalMode
  matchId?: string
  createdAt?: string
}
