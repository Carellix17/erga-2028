/**
 * Shared VISION caller with 3-tier fallback chain.
 *
 * Solo i provider che sanno "vedere" le immagini:
 *  1. ERGA_GEMINI_KEY_APRIL  → Google Gemini 2.5 Flash (endpoint OpenAI-compatibile)
 *  2. ERGA_OPENAI_KEY_APRIL  → OpenAI gpt-4o-mini (supporta image_url)
 *  3. LOVABLE_API_KEY         → Lovable AI Gateway (google/gemini-2.5-flash)
 *
 * Groq NON c'e' di proposito: i modelli della catena testuale sono solo-testo.
 *
 * Prima di questo file, le macchine "con gli occhi" (estrazione foto, figure
 * dei PDF) chiamavano SOLO il gateway Lovable: se quello aveva problemi,
 * tutto si fermava anche con gli altri fornitori sani. Ora hanno la stessa
 * catena di riserva del testo.
 */

interface VisionCallOptions {
  messages: { role: string; content: unknown }[];
  max_tokens?: number;
  temperature?: number;
}

interface VisionProvider {
  label: string;
  url: string;
  keyEnv: string;
  model: string;
}

const VISION_PROVIDERS: VisionProvider[] = [
  {
    label: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "ERGA_GEMINI_KEY_APRIL",
    model: "gemini-2.5-flash",
  },
  {
    label: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "ERGA_OPENAI_KEY_APRIL",
    model: "gpt-4o-mini",
  },
  {
    label: "lovable-gateway",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    keyEnv: "LOVABLE_API_KEY",
    model: "google/gemini-2.5-flash",
  },
];

function isTransient(status: number): boolean {
  return [429, 500, 502, 503, 504].includes(status);
}

/**
 * Chiama un modello con capacita' vision, passando al fornitore successivo
 * in caso di errore. Lancia solo se TUTTI i provider falliscono.
 * Restituisce il JSON grezzo della risposta (formato OpenAI chat completions).
 */
export async function callVisionJson(opts: VisionCallOptions): Promise<unknown> {
  const errors: string[] = [];

  for (const provider of VISION_PROVIDERS) {
    const apiKey = Deno.env.get(provider.keyEnv);
    if (!apiKey) {
      console.log(`[vision] no key for ${provider.label}, skipping`);
      continue;
    }

    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: opts.messages,
            max_tokens: opts.max_tokens ?? 4000,
            temperature: opts.temperature ?? 0,
          }),
        });

        if (resp.ok) {
          console.log(`[vision] using ${provider.label.toUpperCase()} (attempt ${attempt + 1})`);
          return await resp.json();
        }

        const errBody = await resp.text();
        console.warn(`[vision] ${provider.label} error ${resp.status}: ${errBody.substring(0, 300)}`);

        if (isTransient(resp.status) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        errors.push(`${provider.label}: HTTP ${resp.status}`);
        break; // errore non transitorio → prossimo fornitore
      } catch (err) {
        console.warn(`[vision] ${provider.label} network error:`, err);
        errors.push(`${provider.label}: network`);
        break;
      }
    }
  }

  throw new Error(`Tutti i provider vision non disponibili (${errors.join(" | ") || "nessuna chiave"})`);
}

/** Convenience: chiamata vision che restituisce solo il testo della risposta. */
export async function callVisionText(opts: VisionCallOptions): Promise<string> {
  const data = (await callVisionJson(opts)) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || "";
}
