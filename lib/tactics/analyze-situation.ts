import { createHash } from "crypto"
import { GoogleGenAI } from "@google/genai"
import { getAnthropicClient } from "./anthropic-client"
import type { Pion } from "@/types/tactical"

const CLAUDE_MODEL = "claude-haiku-4-5-20251001"
// Modèle Gemini supportant la troncature MRL (outputDimensionality) pour matcher la colonne
// vector(1536) — à confirmer contre la doc Gemini au moment du premier appel réel (les modèles
// d'embedding antérieurs à 2024, ex. models/embedding-001, ne supportent pas ce paramètre).
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
const EMBEDDING_DIMENSIONS = 1536

// Référentiel de tags déjà utilisé dans lib/concepts.ts (extrait via `grep tag:`) — contraint
// Claude à rester cohérent avec le vocabulaire tactique déjà présent ailleurs dans l'app.
export const TACTICAL_TAGS = [
  "Attaque", "Construction", "Défense", "Possession", "Pressing", "Système", "Transition",
] as const

export interface SituationInput {
  pions: Pion[]
  ball: { x: number; y: number }
  phaseOfPlay?: string
}

export interface ClaudeAnalysis {
  description: string
  tags: string[]
  principle: string
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante — ajoute-la dans .env.local")
  return new GoogleGenAI({ apiKey })
}

// Représentation textuelle compacte, déterministe (triée par id) des positions — sert à la fois
// de contexte pour Claude et de base du hash de cache.
function describePositions(input: SituationInput): string {
  const sorted = [...input.pions].sort((a, b) => a.id.localeCompare(b.id))
  const lines = sorted.map(p => {
    const dir = p.dirX !== undefined && p.dirY !== undefined
      ? ` dirigé vers (${p.dirX.toFixed(2)}, ${p.dirY.toFixed(2)})`
      : ""
    return `- Équipe ${p.team}, n°${p.number} (${p.id}) : x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}${dir}`
  })
  lines.push(`- Ballon : x=${input.ball.x.toFixed(1)}, y=${input.ball.y.toFixed(1)}`)
  if (input.phaseOfPlay) lines.push(`- Phase de jeu indiquée par le coach : ${input.phaseOfPlay}`)
  return lines.join("\n")
}

// Hash stable des positions **normalisées** (canonicalizeAttackDirection déjà appliqué en amont) —
// sert de clé de cache pour ne pas rappeler Claude/Gemini sur une situation déjà analysée.
export function hashPositions(pions: Pion[], ball: { x: number; y: number }): string {
  const sorted = [...pions].sort((a, b) => a.id.localeCompare(b.id))
  const payload = JSON.stringify({
    pions: sorted.map(p => ({ team: p.team, x: Math.round(p.x), y: Math.round(p.y) })),
    ball: { x: Math.round(ball.x), y: Math.round(ball.y) },
  })
  return createHash("sha256").update(payload).digest("hex")
}

// Coordonnées 0-100% arrondies à l'entier avant hash : deux situations à un pixel près
// (bruit de drag) partagent le même cache plutôt que de déclencher un appel API inutile.

export async function analyzeSituationWithClaude(input: SituationInput): Promise<ClaudeAnalysis> {
  const client = getAnthropicClient()
  const positionsText = describePositions(input)

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system:
      "Tu es un analyste tactique football (référentiel DTN/UEFA/FIFA), tu décris en français " +
      "une situation de jeu à partir des positions des joueurs sur un terrain 68x105m " +
      "(convention interne : l'équipe A attaque vers y croissant). Reste factuel et concis, " +
      "langage utilisé par un coach professionnel — pas de superlatifs.",
    messages: [{ role: "user", content: `Positions (attaque canonique vers y croissant) :\n${positionsText}` }],
    tools: [{
      name: "record_tactical_analysis",
      description: "Enregistre la description, les tags et le principe tactique de la situation.",
      input_schema: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "2 à 4 phrases décrivant la situation tactique en français.",
          },
          tags: {
            type: "array",
            items: { type: "string", enum: [...TACTICAL_TAGS] },
            description: "1 à 3 tags parmi le référentiel fourni.",
          },
          principle: {
            type: "string",
            description: "Le principe tactique clé illustré, en une phrase courte.",
          },
        },
        required: ["description", "tags", "principle"],
      },
    }],
    tool_choice: { type: "tool", name: "record_tactical_analysis" },
  })

  const toolUse = message.content.find(block => block.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude n'a pas renvoyé d'analyse structurée.")
  }
  return toolUse.input as ClaudeAnalysis
}

export async function embedDescription(text: string): Promise<number[]> {
  const ai = getGeminiClient()
  const result = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "RETRIEVAL_DOCUMENT" },
  })
  const values = result.embeddings?.[0]?.values
  if (!values) throw new Error("Gemini n'a pas renvoyé d'embedding.")
  return values
}

// Relire une colonne `vector` via PostgREST peut renvoyer soit un tableau JS natif, soit sa
// représentation texte pgvector ("[0.1,0.2,...]") selon les versions — on gère les deux plutôt
// que de supposer une forme précise jamais vérifiée en conditions réelles (pas de clé API pour
// tester le aller-retour complet au moment où ce code est écrit).
export function parseEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value)) return value as number[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}
