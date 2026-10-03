/**
 * 🧾 PACCHETTO 1 — estrazione dei consumi (token) dalle risposte AI.
 *
 * Tutti i provider che usiamo parlano il "dialetto OpenAI": la risposta
 * contiene un oggetto `usage` con prompt_tokens / completion_tokens /
 * total_tokens. Gemini (endpoint OpenAI-compatibile), OpenAI, Groq e il
 * gateway Lovable lo riempiono sempre; se un provider fosse avaro, la
 * funzione restituisce campi null e il registro resta semplicemente
 * senza quella voce (mai in errore: il logging non deve rompere nulla).
 *
 * Modulo PURO: zero dipendenze da Deno, così può essere collaudato dai
 * test Node/vitest come pagemap.ts.
 */

export interface AiUsageTokens {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

const EMPTY: AiUsageTokens = {
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
};

function toCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

/**
 * Estrae i token da una risposta in formato OpenAI chat completions.
 * Accetta l'oggetto già parsato (data) oppure raw text (verrà ignorato).
 */
export function extractUsageTokens(data: unknown): AiUsageTokens {
  if (!data || typeof data !== "object") return EMPTY;
  const usage = (data as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return EMPTY;

  const u = usage as Record<string, unknown>;
  const promptTokens = toCount(u.prompt_tokens);
  const completionTokens = toCount(u.completion_tokens);
  let totalTokens = toCount(u.total_tokens);

  // Qualche provider omette total_tokens ma dà le due parti: si sommano.
  // Se invece dà solo il totale, le parti restano null (niente inventato).
  if (totalTokens === null && promptTokens !== null && completionTokens !== null) {
    totalTokens = promptTokens + completionTokens;
  }

  return { promptTokens, completionTokens, totalTokens };
}
