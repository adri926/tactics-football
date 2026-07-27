"use client"

import { useState, useTransition } from "react"
import PageHeader from "@/components/dashboard/PageHeader"
import FeeStatusBadge from "@/components/dashboard/FeeStatusBadge"
import FeesProgressChart from "@/components/dashboard/FeesProgressChart"
import { setFee, applyFeeToAll, sendFeeReminder, type FeesData, type PlayerFee } from "./actions"

const SECTION: React.CSSProperties = {
  padding: "20px 22px", borderRadius: 12,
  backgroundColor: "var(--bg-card)",
  border: "1px solid rgba(122,154,130,0.08)",
}

const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
  color: "rgba(122,154,130,0.5)", textTransform: "uppercase",
  marginBottom: 6, display: "block",
}

const INPUT: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontWeight: 400, fontSize: 13,
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(122,154,130,0.15)",
  borderRadius: 8, padding: "8px 10px",
  color: "rgba(255,255,255,0.85)",
  width: 90, outline: "none",
}

function formatAmount(value: number) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface Props {
  data: FeesData
}

export default function CotisationsClient({ data }: Props) {
  return (
    <div className="page-pad" style={{ maxWidth: 760 }}>
      <PageHeader label="Mon club" title="Cotisations" subtitle={`Suivi des cotisations — saison ${data.season}.`} />

      <DefaultFeeForm />

      <div style={{ ...SECTION, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <p style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            color: "rgba(122,154,130,0.6)", textTransform: "uppercase",
          }}>
            Total encaissé
          </p>
          <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {formatAmount(data.totalPaid)} € / {formatAmount(data.totalDue)} €
          </p>
        </div>
        <FeesProgressChart totalDue={data.totalDue} totalPaid={data.totalPaid} />
      </div>

      <div style={SECTION}>
        <p style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
          color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 16,
        }}>
          Joueurs ({data.players.length})
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.players.map(p => (
            <FeeRow key={p.playerId} player={p} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DefaultFeeForm() {
  const [amount, setAmount] = useState("")
  const [error, setError]   = useState<string | null>(null)
  const [done, setDone]     = useState(false)
  const [pending, start]    = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)
    start(async () => {
      const res = await applyFeeToAll({ amountDue: amount })
      if (res.ok) setDone(true)
      else setError(res.error)
    })
  }

  return (
    <div style={{ ...SECTION, marginBottom: 16 }}>
      <p style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
        color: "rgba(122,154,130,0.6)", textTransform: "uppercase", marginBottom: 12,
      }}>
        Cotisation par défaut
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label style={LABEL}>Montant dû (€)</label>
          <input
            type="number" min="0" step="0.01" required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="150"
            style={INPUT}
          />
        </div>
        <button type="submit" disabled={pending} style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          cursor: pending ? "default" : "pointer",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          backgroundColor: "#7A9A82", color: "var(--bg)",
          whiteSpace: "nowrap",
        }}>
          {pending ? "..." : "APPLIQUER À TOUS LES JOUEURS"}
        </button>
      </form>
      <p style={{
        fontFamily: "var(--font-body), sans-serif", fontSize: 12,
        color: error ? "#e07070" : "rgba(255,255,255,0.35)", marginTop: 10,
      }}>
        {error ?? (done ? "Montant appliqué à tous les joueurs." : "Définit le montant dû pour chaque joueur de l'effectif (les paiements déjà enregistrés sont conservés).")}
      </p>
    </div>
  )
}

function FeeRow({ player }: { player: PlayerFee }) {
  const [due, setDue]       = useState(String(player.amountDue))
  const [paid, setPaid]     = useState(String(player.amountPaid))
  const [error, setError]   = useState<string | null>(null)
  const [reminded, setReminded] = useState(false)
  const [pending, start]    = useTransition()
  const [reminding, startReminder] = useTransition()

  function handleSave() {
    setError(null)
    start(async () => {
      const res = await setFee({ playerId: player.playerId, amountDue: due, amountPaid: paid })
      if (!res.ok) setError(res.error)
    })
  }

  function handleRemind() {
    setError(null)
    setReminded(false)
    startReminder(async () => {
      const res = await sendFeeReminder(player.playerId)
      if (res.ok) setReminded(true)
      else setError(res.error)
    })
  }

  const canRemind = (player.status === "unpaid" || player.status === "partial") && !!player.email

  return (
    <div className="card-row" style={{
      padding: "10px 12px", borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(122,154,130,0.06)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
          {player.number !== null ? `#${player.number} ` : ""}{player.firstName} {player.lastName}
        </p>
        {error && (
          <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 11, color: "#e07070", marginTop: 4 }}>
            {error}
          </p>
        )}
      </div>
      <div className="card-row__actions">
      <div>
        <label style={LABEL}>Dû</label>
        <input
          type="number" min="0" step="0.01"
          value={due}
          onChange={e => setDue(e.target.value)}
          style={INPUT}
        />
      </div>
      <div>
        <label style={LABEL}>Payé</label>
        <input
          type="number" min="0" step="0.01"
          value={paid}
          onChange={e => setPaid(e.target.value)}
          style={INPUT}
        />
      </div>
      <FeeStatusBadge status={player.status} />
      {canRemind && (
        <button onClick={handleRemind} disabled={reminding} title={reminded ? "Email envoyé" : "Envoyer un rappel par email"} style={{
          padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(122,154,130,0.2)",
          cursor: reminding ? "default" : "pointer",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          backgroundColor: "transparent",
          color: reminded ? "var(--sauge)" : "rgba(255,255,255,0.5)",
          whiteSpace: "nowrap",
        }}>
          {reminding ? "..." : reminded ? "ENVOYÉ" : "RELANCER"}
        </button>
      )}
      <button onClick={handleSave} disabled={pending} style={{
        padding: "8px 14px", borderRadius: 8, border: "none",
        cursor: pending ? "default" : "pointer",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        backgroundColor: "#7A9A82", color: "var(--bg)",
        whiteSpace: "nowrap",
      }}>
        {pending ? "..." : "OK"}
      </button>
      </div>
    </div>
  )
}
