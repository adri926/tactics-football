import Anthropic from "@anthropic-ai/sdk"

// Même forme que getAI() dans app/tactique/analyse-video/actions.ts (client Gemini) —
// erreur explicite si la clé manque plutôt qu'un échec silencieux plus loin dans l'appel.
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante — ajoute-la dans .env.local")
  return new Anthropic({ apiKey })
}
