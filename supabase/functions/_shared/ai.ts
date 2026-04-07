/**
 * Shared AI caller with 4-tier fallback chain:
 *
 * 1. ERGA_GEMINI_KEY_APRIL  → Google Gemini 2.5 Flash (direct)
 * 2. ERGA_OPENAI_KEY_APRIL  → OpenAI API
 * 3. ERGA_GROQ_KEY_APRIL    → Groq API
 * 4. LOVABLE_API_KEY         → Lovable AI Gateway (final fallback)
 *
 * Retry policy per provider:
 *  - Transient errors (timeout, 500, 502, 503, 429): retry up to 2 times
 *  - Quota/billing errors (402, 403 with quota msg): immediate next provider
 *  - After retries exhausted: next provider
 */

interface ProviderConfig {
  label: string;
  url: string;
  keyEnv: string;
  modelMapper: (model: string) => string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    label: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "ERGA_GEMINI_KEY_APRIL",
    modelMapper: (m) => m.replace(/^google\//, ""),
  },
  {
    label: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "ERGA_OPENAI_KEY_APRIL",
    modelMapper: (_) => "gpt-4o-mini",
  },
  {
    label: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "ERGA_GROQ_KEY_APRIL",
    modelMapper: (_) => "llama-3.1-70b-versatile",
  },
  {
    label: "lovable-gateway",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    keyEnv: "LOVABLE_API_KEY",
    modelMapper: (m) => m ? `google/${m.replace(/^google\//, "")}` : "google/gemini-2.5-flash",
  },
];

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
  model: string,
  label: string,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
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
 * Call AI with automatic 4-tier fallback.
 * Returns the raw Response so callers can handle streaming or JSON.
 */
export async function callAIWithFallback(
  opts: AiCallOptions,
): Promise<Response> {
  const baseModel = opts.model || "gemini-2.5-flash";

  for (let i = 0; i < PROVIDERS.length; i++) {
    const provider = PROVIDERS[i];
    const apiKey = Deno.env.get(provider.keyEnv);

    if (!apiKey) {
      console.log(`[AI] No key for ${provider.label}, skipping`);
      continue;
    }

    const model = provider.modelMapper(baseModel);
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await tryFetch(provider.url, apiKey, opts, model, provider.label);

        if (resp.ok) {
          console.log(`[AI] Using ${provider.label.toUpperCase()} (attempt ${attempt + 1})`);
          return resp;
        }

        const errBody = await resp.text();

        if (isQuotaError(resp.status, errBody)) {
          console.warn(`[AI] ${provider.label} quota/billing error (${resp.status}), next provider`);
          break;
        }

        if (isTransientError(resp.status) && attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`[AI] ${provider.label} transient error (${resp.status}), retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        console.warn(`[AI] ${provider.label} error (${resp.status}), next provider`);
        break;
      } catch (err) {
        if (attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`[AI] ${provider.label} network error, retry ${attempt + 1}/${maxRetries}:`, err);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn(`[AI] ${provider.label} network error after retries, next provider:`, err);
        break;
      }
    }
  }

  throw new Error("Tutti i provider AI non disponibili");
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
