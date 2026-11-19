/**
 * 🧾 PACCHETTO 1 — estrazione dei consumi (token) dalle risposte AI.
 *
 * Due dialetti, letti solo dove ci sono:
 * - OpenAI (`usage`): prompt_tokens, completion_tokens, total_tokens.
 *   Se esposti: prompt_tokens_details.cached_tokens e
 *   completion_tokens_details.reasoning_tokens. L'endpoint Gemini
 *   compatibile spesso NON manda il dettaglio del pensiero: in quel caso
 *   il campo resta null. Non si inventa la differenza fra totale e parti.
 * - Gemini nativo (`usageMetadata`): promptTokenCount, candidatesTokenCount,
 *   totalTokenCount, thoughtsTokenCount, cachedContentTokenCount.
 *
 * I campi di pensiero e cache servono ai contatori futuri. La tabella
 * `ai_usage` non ha ancora quelle colonne: chi scrive il registro non le
 * invia, altrimenti PostgREST rifiuta l'intera riga.
 *
 * Modulo PURO: zero dipendenze da Deno, così può essere collaudato dai
 * test Node/vitest come pagemap.ts.
 */

export interface AiUsageTokens {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  /** Token di pensiero / reasoning, solo se la risposta li dichiara. */
  reasoningTokens: number | null;
  /** Token serviti dalla cache, solo se la risposta li dichiara. */
  cachedTokens: number | null;
}

const EMPTY: AiUsageTokens = {
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  reasoningTokens: null,
  cachedTokens: null,
};

function toCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstCount(source: Record<string, unknown> | null, keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const count = toCount(source[key]);
    if (count !== null) return count;
  }
  return null;
}

function nestedCount(
  source: Record<string, unknown> | null,
  nestedKey: string,
  keys: string[],
): number | null {
  if (!source) return null;
  return firstCount(asRecord(source[nestedKey]), keys);
}

/**
 * Estrae i token da una risposta OpenAI chat completions oppure da
 * `generateContent` (usageMetadata). Testo grezzo e spazzatura → campi null,
 * mai un'eccezione.
 */
export function extractUsageTokens(data: unknown): AiUsageTokens {
  const root = asRecord(data);
  if (!root) return EMPTY;

  const openai = asRecord(root.usage);
  const native = asRecord(root.usageMetadata) ?? asRecord(root.usage_metadata);
  if (!openai && !native) return EMPTY;

  let promptTokens = firstCount(openai, ["prompt_tokens", "input_tokens"]);
  let completionTokens = firstCount(openai, ["completion_tokens", "output_tokens"]);
  let totalTokens = firstCount(openai, ["total_tokens"]);
  let reasoningTokens =
    nestedCount(openai, "completion_tokens_details", ["reasoning_tokens", "reasoningTokens"]) ??
    firstCount(openai, ["reasoning_tokens"]);
  let cachedTokens =
    nestedCount(openai, "prompt_tokens_details", ["cached_tokens", "cachedTokens"]) ??
    firstCount(openai, ["cached_tokens"]);

  if (promptTokens === null) {
    promptTokens = firstCount(native, ["promptTokenCount", "prompt_token_count"]);
  }
  if (completionTokens === null) {
    completionTokens = firstCount(native, ["candidatesTokenCount", "candidates_token_count"]);
  }
  if (totalTokens === null) {
    totalTokens = firstCount(native, ["totalTokenCount", "total_token_count"]);
  }
  if (reasoningTokens === null) {
    reasoningTokens = firstCount(native, ["thoughtsTokenCount", "thoughts_token_count"]);
  }
  if (cachedTokens === null) {
    cachedTokens = firstCount(native, ["cachedContentTokenCount", "cached_content_token_count"]);
  }

  // Qualche provider omette total_tokens ma dà le due parti: si sommano.
  // Se invece dà solo il totale, le parti restano null (niente inventato).
  // Il pensiero non si ricava da totale − parti: quel resto può essere altro.
  if (totalTokens === null && promptTokens !== null && completionTokens !== null) {
    totalTokens = promptTokens + completionTokens;
  }

  return { promptTokens, completionTokens, totalTokens, reasoningTokens, cachedTokens };
}
