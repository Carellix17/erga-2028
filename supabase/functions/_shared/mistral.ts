/**
 * Client Mistral per le Edge Function. Solo testo, solo endpoint UE.
 *
 * Il flag è SPENTO di default. Senza `ERGA_AI_PROVIDER=mistral` e senza
 * chiave non parte nessuna richiesta: la catena Gemini → OpenAI → Groq →
 * Lovable resta quella di oggi. Non accendere il flag senza OK esplicito
 * del CEO.
 *
 * Variabili future (non sono segreti in questo repository, non crearle qui):
 * - `ERGA_AI_PROVIDER` — `mistral` accende il flag. Ogni altro valore, o
 *   l'assenza, lo lascia spento.
 * - `MISTRAL_API_KEY` — chiave dell'account adulto. Senza chiave, nessuna
 *   chiamata, anche se il flag è acceso.
 * - `MISTRAL_MODEL` — facoltativa. Vale solo un id della lista chiusa.
 *   `labs-`, gli alias `-latest` e i Public Preview vengono rifiutati e
 *   Mistral non viene chiamato.
 *
 * Host fisso nel codice: `https://api.eu.mistral.ai`. Non esiste una
 * variabile per cambiarlo. Visione e OCR restano sulle PR successive.
 *
 * Id ammessi, verificati il 19/11/2026 sulle schede ufficiali
 * (docs.mistral.ai, stato General Availability):
 * - `mistral-small-2603` (Mistral Small 4, alias `mistral-small-latest` rifiutato)
 * - `ministral-8b-2512` (Ministral 3 8B, alias `ministral-8b-latest` rifiutato)
 *
 * I Public Preview elencati lo stesso giorno sull'overview modelli
 * (opt-out dal training non vale per loro) sono rifiutati per nome.
 * Qualsiasi altro id, anche se in GA, non è in lista e non parte.
 */

import { extractUsageTokens } from "./usage.ts";

export const MISTRAL_EU_ORIGIN = "https://api.eu.mistral.ai";
export const MISTRAL_CHAT_COMPLETIONS_URL = `${MISTRAL_EU_ORIGIN}/v1/chat/completions`;

export const MISTRAL_PROVIDER_ENV = "ERGA_AI_PROVIDER";
export const MISTRAL_API_KEY_ENV = "MISTRAL_API_KEY";
export const MISTRAL_MODEL_ENV = "MISTRAL_MODEL";

export const MISTRAL_GA_MODELS = ["mistral-small-2603", "ministral-8b-2512"] as const;

export type MistralGaModel = (typeof MISTRAL_GA_MODELS)[number];

export const MISTRAL_MODEL_DEFAULT: MistralGaModel = "mistral-small-2603";

/** Compiti corti: il piano li assegna a Ministral 3 8B. Il resto del testo a Small 4. */
const MINISTRAL_FUNCTIONS = new Set(["generate-exercises"]);

/**
 * La palestra scientifica resta su OpenRouter e sul paracadute attuale.
 * Il piano la tiene fuori da questa PR.
 */
const OUT_OF_SCOPE_FUNCTIONS = new Set(["scientific-gym", "scientific-gym-socratic"]);

/**
 * Public Preview al 19/11/2026 (docs.mistral.ai, overview modelli).
 * L'opt-out dal training non li copre. La lista chiusa li blocca comunque.
 */
export const MISTRAL_PUBLIC_PREVIEW_MODELS = [
  "deepseek-v4-1-flash-1017",
  "voxtral-mini-transcribe-3-0",
  "voxtral-small-transcribe-3-0",
  "voxtral-mini-transcribe-realtime-3-0",
  "voxtral-mini-tts-3-0",
] as const;

const GA_MODEL_SET = new Set<string>(MISTRAL_GA_MODELS);
const PREVIEW_SET = new Set<string>(MISTRAL_PUBLIC_PREVIEW_MODELS);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const STUDENT_NAME_SENTENCE =
  /Lo studente si chiama\s+"[^"]{0,80}"\.\s*Chiamalo per nome quando interagisci\./g;
const HEXAGON_NAME = /Esagono dello studente\s+[—–-]\s+[^)\n]{1,80}/g;

export type MistralRejection = "labs" | "latest" | "public-preview" | "not-allowlisted";

export type MistralSkipReason =
  | "flag-off"
  | "no-key"
  | "model-rejected"
  | "out-of-scope"
  | "empty";

export interface MistralChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralChatBody {
  model: MistralGaModel;
  messages: MistralChatMessage[];
  temperature: number;
  max_tokens: number;
  stream?: true;
}

export type MistralCallPlan =
  | {
    call: false;
    reason: MistralSkipReason;
    rejection?: MistralRejection;
    url?: undefined;
    model?: undefined;
    body?: undefined;
  }
  | {
    call: true;
    reason: "ready";
    rejection?: undefined;
    url: typeof MISTRAL_CHAT_COMPLETIONS_URL;
    model: MistralGaModel;
    body: MistralChatBody;
  };

export function isMistralProviderEnabled(providerEnv: string | null | undefined): boolean {
  return providerEnv?.trim().toLowerCase() === "mistral";
}

export function defaultMistralModel(fn: string | null | undefined): MistralGaModel {
  const tag = fn?.trim();
  if (tag && MINISTRAL_FUNCTIONS.has(tag)) return "ministral-8b-2512";
  return MISTRAL_MODEL_DEFAULT;
}

export type MistralModelDecision =
  | { status: "allowed"; model: MistralGaModel }
  | { status: "rejected"; rejection: MistralRejection };

export function classifyMistralModel(raw: string): MistralModelDecision {
  const id = raw.trim().toLowerCase();
  if (!id) return { status: "rejected", rejection: "not-allowlisted" };
  if (id.startsWith("labs-") || id.includes("/labs-")) return { status: "rejected", rejection: "labs" };
  if (id.endsWith("-latest") || id.includes("-latest")) return { status: "rejected", rejection: "latest" };
  if (PREVIEW_SET.has(id)) return { status: "rejected", rejection: "public-preview" };
  if (!GA_MODEL_SET.has(id)) return { status: "rejected", rejection: "not-allowlisted" };
  return { status: "allowed", model: id as MistralGaModel };
}

export function resolveMistralModel(
  modelEnv: string | null | undefined,
  fn?: string | null,
): MistralModelDecision {
  const trimmed = modelEnv?.trim();
  if (!trimmed) return { status: "allowed", model: defaultMistralModel(fn) };
  return classifyMistralModel(trimmed);
}

function hasIdentity(text: string): boolean {
  return /user_id|userId/i.test(text) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text);
}

/**
 * Tiene solo il testo. Toglie nome, email e user id.
 * Il campo `cognitive_profiles.eta` si toglie sempre. `eta`/`età` seguito
 * da un numero si toglie se nello stesso invio c'è anche un id utente.
 * In un testo di studio, senza id («età moderna»), l'età resta.
 */
export function sanitizeTextForMistral(text: string, identityInRequest = hasIdentity(text)): string {
  let out = text.replace(STUDENT_NAME_SENTENCE, "");
  out = out.replace(HEXAGON_NAME, "Esagono dello studente");
  out = out.replace(/\b(?:first_name|nickname|user_email|userEmail)\b\s*[:=]\s*"?[^",\n}]+"?/gi, "");
  out = out.replace(/cognitive_profiles\.eta\b\s*[:=]?\s*\d*/gi, "");
  out = out.replace(/["'](?:eta|età)["']\s*:\s*\d+/gi, "");
  if (identityInRequest) {
    // `\b` non vede la è: il confine si fa sui caratteri, non sul flag ASCII.
    out = out.replace(/(^|[^\p{L}\p{N}_])((?:eta|età)\s*[:=]\s*\d+)/giu, "$1");
  }
  out = out.replace(/\buser_id\b\s*[:=]\s*"?[^",\s}]+"?/gi, "");
  out = out.replace(/\buserId\b\s*[:=]\s*"?[^",\s}]+"?/g, "");
  out = out.replace(EMAIL_RE, "[omesso]");
  out = out.replace(UUID_RE, "[omesso]");
  return out;
}

function textFromContent(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      parts.push(part);
      continue;
    }
    if (!part || typeof part !== "object") continue;
    const record = part as { type?: unknown; text?: unknown };
    if (record.type === "text" && typeof record.text === "string") parts.push(record.text);
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

export function sanitizeMessagesForMistral(
  messages: { role: string; content: unknown }[],
): MistralChatMessage[] {
  const texts = messages.map((message) => textFromContent(message.content) ?? "");
  const identityInRequest = hasIdentity(texts.join("\n"));
  const out: MistralChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== "system" && message.role !== "user" && message.role !== "assistant") continue;
    if (!texts[i]) continue;
    const content = sanitizeTextForMistral(texts[i], identityInRequest).trim();
    if (!content) continue;
    out.push({ role: message.role, content });
  }
  return out;
}

export function planMistralCall(input: {
  providerEnv: string | null | undefined;
  apiKey: string | null | undefined;
  modelEnv: string | null | undefined;
  fn?: string | null;
  messages: { role: string; content: unknown }[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): MistralCallPlan {
  if (!isMistralProviderEnabled(input.providerEnv)) {
    return { call: false, reason: "flag-off" };
  }
  const tag = input.fn?.trim();
  if (tag && OUT_OF_SCOPE_FUNCTIONS.has(tag)) {
    return { call: false, reason: "out-of-scope" };
  }
  if (!input.apiKey?.trim()) {
    return { call: false, reason: "no-key" };
  }
  const model = resolveMistralModel(input.modelEnv, input.fn);
  if (model.status === "rejected") {
    return { call: false, reason: "model-rejected", rejection: model.rejection };
  }
  const messages = sanitizeMessagesForMistral(input.messages);
  if (messages.length === 0) {
    return { call: false, reason: "empty" };
  }
  const body: MistralChatBody = {
    model: model.model,
    messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 2048,
  };
  if (input.stream) body.stream = true;
  return {
    call: true,
    reason: "ready",
    url: MISTRAL_CHAT_COMPLETIONS_URL,
    model: model.model,
    body,
  };
}

type MistralFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<Response>;

/**
 * Esegue il piano. Se il piano non chiama, `fetch` non parte.
 * La chiave sta solo nell'header Authorization, mai nell'URL né nel corpo.
 */
export async function dispatchMistral(
  plan: MistralCallPlan,
  apiKey: string,
  fetchImpl: MistralFetch,
): Promise<Response | null> {
  if (!plan.call) return null;
  const key = apiKey.trim();
  if (!key) return null;
  if (plan.url !== MISTRAL_CHAT_COMPLETIONS_URL) return null;
  if (!GA_MODEL_SET.has(plan.body.model)) return null;
  const body = JSON.stringify(plan.body);
  if (plan.url.includes(key) || body.includes(key)) {
    throw new Error("mistral-request-refused");
  }
  return fetchImpl(plan.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body,
  });
}

/**
 * Campi già scritti oggi su `ai_usage`. Nessuna colonna nuova.
 * La cache (`prompt_tokens_details.cached_tokens`) si legge con
 * `extractUsageTokens`, come per Gemini, ma il logger non la invia:
 * un campo sconosciuto al database rifiuterebbe l'intera riga.
 */
export function mistralUsageInsert(
  model: MistralGaModel,
  data: unknown,
): {
  provider: "mistral";
  model: MistralGaModel;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
} {
  const tokens = extractUsageTokens(data);
  return {
    provider: "mistral",
    model,
    prompt_tokens: tokens.promptTokens,
    completion_tokens: tokens.completionTokens,
    total_tokens: tokens.totalTokens,
  };
}
