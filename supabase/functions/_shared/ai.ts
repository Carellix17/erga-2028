/**
 * Shared AI caller with primary (Gemini direct) / fallback (Lovable AI Gateway).
 *
 * Primary: ERGA_GEMINI_KEY_APRIL → Google Gemini 2.5 Flash (direct)
 * Fallback: LOVABLE_API_KEY → Lovable AI Gateway (gemini-2.5-flash)
 *
 * Retry policy:
 *  - Transient errors (timeout, 500, 502, 503, 429): retry up to 2 times
 *  - Quota/billing errors (402, 403 with quota msg): immediate fallback, no retry
 *  - After retries exhausted: fallback
 */

const GEMINI_DIRECT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LOVABLE_GATEWAY_URL =
  "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AiCallOptions {
  messages: { role: string; content: unknown }[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
}

function isQuotaError(status: number, body: string): boolean {
  if (status === 402) return true;
  if (status === 403 && /quota|billing|exceeded|insufficient/i.test(body)) return true;
  if (status === 429 && /quota|resource.*exhausted/i.test(body)) return true;
  return false;
}

function isTransientError(status: number): boolean {
  return [429, 500, 502, 503, 504].includes(status);
}

async function tryFetch(
  url: string,
  apiKey: string,
  opts: AiCallOptions,
  label: string,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: opts.model || "gemini-2.5-flash",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 2048,
  };
  if (opts.stream) body.stream = true;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  console.log(`[AI:${label}] status=${resp.status}`);
  return resp;
}

/**
 * Call AI with automatic fallback.
 * Returns the raw Response so callers can handle streaming or JSON.
 */
export async function callAIWithFallback(
  opts: AiCallOptions,
): Promise<Response> {
  const primaryKey = Deno.env.get("ERGA_GEMINI_KEY_APRIL");
  const fallbackKey = Deno.env.get("LOVABLE_API_KEY");

  if (!fallbackKey) throw new Error("LOVABLE_API_KEY mancante");

  // ── Try primary ──
  if (primaryKey) {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await tryFetch(GEMINI_DIRECT_URL, primaryKey, opts, "primary");

        if (resp.ok) {
          console.log(`[AI] Using PRIMARY (attempt ${attempt + 1})`);
          return resp;
        }

        const errBody = await resp.text();

        // Quota/billing → immediate fallback
        if (isQuotaError(resp.status, errBody)) {
          console.warn(`[AI] PRIMARY quota/billing error (${resp.status}), switching to FALLBACK`);
          break;
        }

        // Transient → retry
        if (isTransientError(resp.status) && attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`[AI] PRIMARY transient error (${resp.status}), retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Non-retryable non-quota error → fallback
        console.warn(`[AI] PRIMARY error (${resp.status}), switching to FALLBACK`);
        break;
      } catch (err) {
        // Network / timeout
        if (attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`[AI] PRIMARY network error, retry ${attempt + 1}/${maxRetries} in ${delay}ms:`, err);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn("[AI] PRIMARY network error after retries, switching to FALLBACK:", err);
        break;
      }
    }
  } else {
    console.log("[AI] No PRIMARY key, using FALLBACK directly");
  }

  // ── Fallback ──
  // For Lovable gateway the model must be prefixed
  const fallbackOpts = {
    ...opts,
    model: opts.model ? `google/${opts.model.replace(/^google\//, "")}` : "google/gemini-2.5-flash",
  };
  const resp = await tryFetch(LOVABLE_GATEWAY_URL, fallbackKey, fallbackOpts, "fallback");

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`[AI] FALLBACK error (${resp.status}):`, errBody);
    throw new Error("Errore nella risposta AI");
  }

  console.log("[AI] Using FALLBACK");
  return resp;
}

/**
 * Convenience: call AI and return the text content (non-streaming).
 */
export async function callAIText(
  messages: { role: string; content: string }[],
  temperature = 0.7,
  maxTokens = 2048,
): Promise<string> {
  const resp = await callAIWithFallback({
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Convenience: call AI and return a streaming Response (for chat).
 */
export async function callAIStream(
  messages: { role: string; content: unknown }[],
  temperature = 0.7,
  maxTokens = 1024,
): Promise<Response> {
  return callAIWithFallback({
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });
}
