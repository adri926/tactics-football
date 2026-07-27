"use client"

import { useState, useTransition } from "react"
import { searchTacticalSituations, type SimilarSituation } from "@/app/tactique/digiboard/tactics-actions"

// Recherche sémantique en langage naturel dans la bibliothèque de situations (curatées + club
// courant) — distincte de "MES BOARDS" (tactical_boards, schémas sauvegardés bruts sans analyse IA).
export default function TacticalSearchPanel() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SimilarSituation[] | null>(null)
  const [error, setError] = useState("")
  const [isPending, startSearch] = useTransition()

  const handleSearch = () => {
    setError("")
    startSearch(async () => {
      const res = await searchTacticalSituations({ query })
      if (res.ok) setResults(res.results)
      else { setError(res.error); setResults(null) }
    })
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSearch() }}
          placeholder="ex: bloc bas avec sortie rapide sur ailier…"
          className="flex-1 text-xs rounded-lg px-2.5 py-2 focus:outline-none"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "rgba(255,255,255,0.8)",
            backgroundColor: "rgba(122,154,130,0.06)",
            border: "1px solid rgba(122,154,130,0.18)",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={isPending || query.trim().length < 3}
          className="text-xs font-bold px-3 rounded-lg transition"
          style={{
            backgroundColor: "rgba(122,154,130,0.18)",
            border: "1px solid rgba(122,154,130,0.4)",
            color: "#7A9A82",
            opacity: isPending || query.trim().length < 3 ? 0.5 : 1,
          }}
        >
          {isPending ? "…" : "OK"}
        </button>
      </div>

      {error && (
        <p className="text-[11px]" style={{ color: "#e07050", fontFamily: "var(--font-mono), monospace" }}>
          {error}
        </p>
      )}

      {results && results.length === 0 && (
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
          Aucune situation trouvée.
        </p>
      )}

      {results && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", flex: 1 }}>
          {results.map(r => (
            <div key={r.id} style={{
              padding: "8px 10px", borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(122,154,130,0.12)",
            }}>
              <p className="text-xs" style={{ fontFamily: "var(--font-body), sans-serif", color: "rgba(255,255,255,0.85)" }}>
                {r.description}
              </p>
              <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                <div className="flex flex-wrap gap-1">
                  {r.tags.map(tag => (
                    <span key={tag} style={{
                      fontFamily: "var(--font-mono), monospace", fontSize: 8,
                      color: "rgba(122,154,130,0.7)",
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "rgba(122,154,130,0.4)" }}>
                  {(r.similarity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
