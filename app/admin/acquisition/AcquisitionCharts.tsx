"use client"

// [Backoffice — Phase 0] Graphes d'acquisition (Recharts). Palette design system (sauge sur fond
// sombre). Reçoit des données réelles ; à 0 signup, la page parente affiche un état vide à la place.
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts"

const SAUGE = "#7A9A82"
const GRID = "rgba(122,154,130,0.12)"
const AXIS = "rgba(255,255,255,0.35)"

const tooltipStyle = {
  backgroundColor: "#1e1c14",
  border: "1px solid rgba(122,154,130,0.3)",
  borderRadius: 8,
  fontFamily: "var(--font-mono), monospace",
  fontSize: 11,
  color: "#F2F1EA",
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: AXIS, fontSize: 10, fontFamily: "monospace" }} interval="preserveStartEnd" minTickGap={24} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,154,130,0.08)" }} labelFormatter={(label) => shortDate(String(label))} />
          <Bar dataKey="count" fill={SAUGE} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SourcesChart({ data }: { data: { source: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: Math.max(120, data.length * 40) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="source" width={90} tick={{ fill: AXIS, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,154,130,0.08)" }} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {data.map((_, i) => <Cell key={i} fill={SAUGE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
