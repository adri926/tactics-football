"use client"

// [Backoffice — Phase 0] Panneau d'actions sur un compte (note, à recontacter, résilier, créditer
// IA, débloquer une frontière). Chaque action passe par une server action qui journalise dans
// admin_actions AVANT de muter. Outil interne → UI compacte, pas de fioritures.
import { useState, useTransition } from "react"
import { addNote, markRemind, cancelSubscription, creditVideoMinutes, unblockFeature } from "./actions"

type Panel = null | "note" | "cancel" | "credit" | "unblock"

const FEATURES = [
  { key: "cotisations", label: "Cotisations" },
  { key: "extra_team", label: "Équipes multiples" },
  { key: "season_archive", label: "Historique saisons" },
  { key: "medical", label: "Suivi médical" },
  { key: "multi_admin", label: "Multi-admin" },
]

const btn: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
  padding: "6px 10px", borderRadius: 6, cursor: "pointer",
  backgroundColor: "var(--sauge-dim)", border: "1px solid var(--sauge-border)", color: "var(--sauge)",
}
const input: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif", fontSize: 12, width: "100%",
  backgroundColor: "var(--bg-input)", border: "1px solid rgba(122,154,130,0.18)",
  borderRadius: 6, padding: "7px 9px", color: "var(--text-primary)", outline: "none",
}

export default function AccountActions({ clubId, clubName }: { clubId: string; clubName: string }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [text, setText] = useState("")
  const [num, setNum] = useState("")
  const [feature, setFeature] = useState(FEATURES[0].key)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, successMsg: string) {
    setMsg(null)
    start(async () => {
      const res = await fn()
      if (res.ok) { setMsg(successMsg); setPanel(null); setText(""); setNum("") }
      else setMsg(res.error)
    })
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn} onClick={() => setPanel(panel === "note" ? null : "note")}>NOTE</button>
        <button style={btn} disabled={pending} onClick={() => run(() => markRemind(clubId), "Marqué à recontacter")}>À RECONTACTER</button>
        <button style={btn} onClick={() => setPanel(panel === "credit" ? null : "credit")}>CRÉDITER IA</button>
        <button style={btn} onClick={() => setPanel(panel === "unblock" ? null : "unblock")}>DÉBLOQUER</button>
        <button style={{ ...btn, color: "#c98b7f", borderColor: "rgba(201,139,127,0.4)", backgroundColor: "rgba(201,139,127,0.1)" }}
          onClick={() => setPanel(panel === "cancel" ? null : "cancel")}>RÉSILIER</button>
      </div>

      {panel === "note" && (
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <textarea placeholder={`Note interne sur ${clubName}`} value={text} onChange={e => setText(e.target.value)} style={{ ...input, minHeight: 52, resize: "vertical" }} />
          <button style={btn} disabled={pending || !text.trim()} onClick={() => run(() => addNote(clubId, text), "Note ajoutée")}>OK</button>
        </div>
      )}

      {panel === "credit" && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="number" placeholder="Plafond hebdo IA (min)" value={num} onChange={e => setNum(e.target.value)} style={input} />
          <input placeholder="Raison" value={text} onChange={e => setText(e.target.value)} style={input} />
          <button style={btn} disabled={pending || !num} onClick={() => run(() => creditVideoMinutes(clubId, Number(num), text), "Minutes IA créditées")}>OK</button>
        </div>
      )}

      {panel === "unblock" && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <select value={feature} onChange={e => setFeature(e.target.value)} style={{ ...input, cursor: "pointer" }}>
            {FEATURES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <input placeholder="Raison" value={text} onChange={e => setText(e.target.value)} style={input} />
          <button style={btn} disabled={pending} onClick={() => run(() => unblockFeature(clubId, feature, null, text), "Frontière débloquée")}>OK</button>
        </div>
      )}

      {panel === "cancel" && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <input placeholder="Raison de résiliation (obligatoire)" value={text} onChange={e => setText(e.target.value)} style={input} />
          <button style={{ ...btn, color: "#c98b7f", borderColor: "rgba(201,139,127,0.4)", backgroundColor: "rgba(201,139,127,0.1)" }}
            disabled={pending || text.trim().length < 3} onClick={() => run(() => cancelSubscription(clubId, text), "Abonnement résilié")}>CONFIRMER</button>
        </div>
      )}

      {msg && (
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>{msg}</p>
      )}
    </div>
  )
}
