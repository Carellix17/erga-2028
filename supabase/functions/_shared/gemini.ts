/**
 * Gemini pronto al redirect del 1° dicembre 2026.
 *
 * Da quella data Google inoltra `gemini-2.5-flash` a `gemini-3.5-flash-lite`
 * e lo fattura come Flash-Lite. L'id esatto, verificato sulla scheda modello
 * ufficiale (ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), è
 * `gemini-3.5-flash-lite`.
 *
 * Questo modulo è puro: niente Deno, così i test Vitest possono importarlo.
 * Le Edge Function leggono le variabili e gli passano i valori.
 *
 * Variabili facoltative (segreto/config dell'ambiente, mai nel repository):
 * - `GEMINI_MODEL` — id diretto. Default `gemini-3.5-flash-lite`.
 *   Per tornare indietro, finché l'API lo accetta: `gemini-2.5-flash`.
 * - `GEMINI_MODEL_FALLBACK` — secondo tentativo del PDF nativo.
 *   Default `gemini-2.5-flash-lite` (non è in dismissione).
 * - `GEMINI_THINKING_OVERRIDES` — `funzione=livello` separati da virgole.
 *   Livelli: minimal, low, medium, high.
 *   Esempio: `generate-lessons=high,extract-pdf=low`.
 *
 * Su Gemini 3.x non si invia `temperature` (oggi ignorata, in futuro HTTP 400:
 * guida «What's new in Gemini 3.6 Flash and 3.5 Flash-Lite»). OpenAI, Groq e
 * il gateway Lovable restano com'erano, temperatura inclusa.
 *
 * Il pensiero si imposta solo sul modello 3.x diretto:
 * - endpoint OpenAI-compatibile: `reasoning_effort` (mappato da Google su
 *   `thinking_level`; tabella nella guida OpenAI compatibility);
 * - `generateContent`: `generationConfig.thinkingConfig.thinkingLevel`.
 * Non si mandano insieme, e non si manda `thinkingBudget` (su Flash-Lite dà 400).
 *
 * Default per funzione. Il modello, se non glielo diciamo, pensa a `minimal`:
 * va bene per l'OCR, taglia corto le lezioni. `high` è il default storico di
 * altri Gemini 3 e farebbe esplodere i token: non lo usiamo.
 *
 * | funzione                  | livello  | perché                                      |
 * |---------------------------|----------|---------------------------------------------|
 * | generate-lessons          | medium   | lezione lunga e strutturata                 |
 * | generate-lessons-demo     | medium   | come le lezioni                             |
 * | interrogazione            | medium   | dialogo d'esame, serve ragionare           |
 * | generate-exercises        | medium   | quesiti e soluzioni                         |
 * | generate-plan             | medium   | piano di studio strutturato                 |
 * | scientific-gym            | medium   | problemi scientifici                        |
 * | study-tutor               | medium   | materiale di studio strutturato             |
 * | chat                      | low      | turno breve, latenza                        |
 * | lesson-chat               | low      | turno breve                                 |
 * | scientific-gym-socratic   | low      | battuta breve                               |
 * | web-search                | low      | un solo turno di prosa, poco pensiero       |
 * | extract-pdf               | minimal  | trascrizione, massimo throughput            |
 * | extract-lesson-figures    | minimal  | estrazione visiva                           |
 * | (senza etichetta)         | low      | prudente, non il default `minimal` del modello |
 *
 * Il gateway Lovable tiene `google/gemini-2.5-flash`: il suo catalogo è
 * separato e un id nuovo può far fallire l'ultima riserva. Non gli si toglie
 * la temperatura e non gli si manda il pensiero.
 */

export const GEMINI_MODEL_DEFAULT = "gemini-3.5-flash-lite";

/** Id precedente. Dal 1/12/2026 Google lo reindirizza a Flash-Lite. */
export const GEMINI_MODEL_ROLLBACK = "gemini-2.5-flash";

/**
 * Secondo tentativo dell'estrattore PDF. Resta disponibile: la scheda
 * deprecazioni non gli dà una data di spegnimento.
 */
export const GEMINI_PDF_FALLBACK_MODEL = "gemini-2.5-flash-lite";

/**
 * Id che il gateway Lovable riceve oggi. Non segue `GEMINI_MODEL`:
 * cambiare stringa cambierebbe il comportamento dell'ultima riserva.
 */
export const GEMINI_LOVABLE_GATEWAY_MODEL = "google/gemini-2.5-flash";

export const GEMINI_THINKING_LEVELS = ["minimal", "low", "medium", "high"] as const;

export type GeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number];

export const GEMINI_THINKING_DEFAULT: GeminiThinkingLevel = "low";

export const GEMINI_THINKING_BY_FUNCTION: Readonly<Record<string, GeminiThinkingLevel>> = {
  "generate-lessons": "medium",
  "generate-lessons-demo": "medium",
  interrogazione: "medium",
  "generate-exercises": "medium",
  "generate-plan": "medium",
  "scientific-gym": "medium",
  "study-tutor": "medium",
  chat: "low",
  "lesson-chat": "low",
  "scientific-gym-socratic": "low",
  "web-search": "low",
  "extract-pdf": "minimal",
  "extract-lesson-figures": "minimal",
};

const THINKING_LEVEL_SET = new Set<string>(GEMINI_THINKING_LEVELS);

export function canonicalGeminiModelId(model: string): string {
  return model.trim().replace(/^models\//, "").replace(/^google\//, "");
}

/** Vero per la famiglia 3 (`gemini-3`, `gemini-3.5-flash-lite`, `gemini-3-flash-preview`). */
export function isGemini3Model(model: string): boolean {
  return /^gemini-3(?:$|[.-])/.test(canonicalGeminiModelId(model));
}

export function resolveGeminiModel(
  envValue: string | null | undefined,
  fallback = GEMINI_MODEL_DEFAULT,
): string {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : fallback;
}

export function isGeminiThinkingLevel(value: string | null | undefined): value is GeminiThinkingLevel {
  return typeof value === "string" && THINKING_LEVEL_SET.has(value);
}

/**
 * `fn=livello` separati da virgole. Livello sconosciuto o pezzo malformato:
 * si ignora quel pezzo, il resto vale. L'ultima copia della stessa funzione vince.
 */
export function parseThinkingOverrides(
  raw: string | null | undefined,
): Readonly<Record<string, GeminiThinkingLevel>> {
  const out: Record<string, GeminiThinkingLevel> = {};
  if (!raw) return out;
  for (const part of raw.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const fn = part.slice(0, eq).trim();
    const level = part.slice(eq + 1).trim().toLowerCase();
    if (!fn || !isGeminiThinkingLevel(level)) continue;
    out[fn] = level;
  }
  return out;
}

export function resolveGeminiThinkingLevel(
  fn: string | null | undefined,
  overridesRaw?: string | null,
): GeminiThinkingLevel {
  const tag = fn?.trim();
  if (!tag) return GEMINI_THINKING_DEFAULT;
  const override = parseThinkingOverrides(overridesRaw)[tag];
  if (override) return override;
  return GEMINI_THINKING_BY_FUNCTION[tag] ?? GEMINI_THINKING_DEFAULT;
}

/**
 * Campi da unire al corpo chat-completions.
 * La temperatura esce solo per Gemini 3 diretto. Gli altri provider la tengono,
 * anche se il nome del modello contiene «gemini-3» (è il caso da non toccare
 * del gateway Lovable).
 */
export function geminiChatSampling(
  providerLabel: string,
  model: string,
  temperature: number,
  fn: string | null | undefined,
  thinkingOverrides?: string | null,
): { temperature?: number; reasoning_effort?: GeminiThinkingLevel } {
  if (providerLabel === "gemini" && isGemini3Model(model)) {
    return {
      reasoning_effort: resolveGeminiThinkingLevel(fn, thinkingOverrides),
    };
  }
  return { temperature };
}

/**
 * `generationConfig` nativo. Su 3.x: niente temperatura, pensiero per funzione.
 * Su 2.x: temperatura com'era, niente `thinkingLevel` (quella famiglia usa
 * `thinkingBudget`, che su Flash-Lite risponde 400).
 */
export function geminiNativeGenerationConfig(options: {
  model: string;
  maxOutputTokens: number;
  temperature?: number;
  fn?: string | null;
  thinkingOverrides?: string | null;
}): Record<string, unknown> {
  const config: Record<string, unknown> = {
    maxOutputTokens: options.maxOutputTokens,
  };
  if (isGemini3Model(options.model)) {
    config.thinkingConfig = {
      thinkingLevel: resolveGeminiThinkingLevel(options.fn, options.thinkingOverrides),
    };
    return config;
  }
  if (options.temperature !== undefined) {
    config.temperature = options.temperature;
  }
  return config;
}
