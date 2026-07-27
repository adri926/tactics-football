// Adaptateur GPS (ex. Footbar Meteor) — squelette volontairement minimal. Le mapping réel des
// colonnes ne peut pas être écrit sans un export CSV réel en main (le format varie selon le
// partenaire). Ajuster mapRow() une fois le format confirmé, sans toucher au reste du pipeline
// (le moteur de pitch control et le rejeu ne changent jamais, cf. lib/tracking/replay.ts).
import type { TrackingAdapter, TrackingFrame } from "../types"

export interface GpsCsvRow {
  [column: string]: string
}

function mapRow(_row: GpsCsvRow): TrackingFrame {
  throw new Error(
    "Mapping GPS CSV non configuré — ajuster mapRow() dans lib/tracking/adapters/gps-csv.ts " +
    "une fois le format d'export réel (ex. Footbar Meteor) confirmé."
  )
}

export const gpsCsvAdapter: TrackingAdapter<GpsCsvRow[]> = {
  source: "gps_csv",
  parse: rows => rows.map(mapRow),
}
