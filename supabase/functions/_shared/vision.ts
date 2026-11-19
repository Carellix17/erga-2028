/**
 * Shared VISION caller with 3-tier fallback chain.
 *
 * Solo i provider che sanno "vedere" le immagini:
 *  1. ERGA_GEMINI_KEY_APRIL  → Google Gemini diretto (default gemini-3.5-flash-lite)
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

import { logAiUsage } from "./aiUsage.ts";
import { extractUsageTokens } from "./usage.ts";
import {
  GEMINI_LOVABLE_GATEWAY_MODEL,
  GEMINI_MODEL_DEFAULT,
  geminiChatSampling,
  resolveGeminiModel,
} from "./gemini.ts";

interface VisionCallOptions {
  messages: { role: string; content: unknown }[];
  max_tokens?: number;
  temperature?: number;
  /** opzionale: id utente (uuid) da associare alla riga di ai_usage */
  userId?: string;
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
    // Sostituito a ogni chiamata da GEMINI_MODEL (default sotto).
    model: GEMINI_MODEL_DEFAULT,
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
    model: GEMINI_LOVABLE_GATEWAY_MODEL,
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
export async function callVisionJson(opts: VisionCallOptions, tag?: string): Promise<unknown> {
  const errors: string[] = [];
  const thinkingOverrides = Deno.env.get("GEMINI_THINKING_OVERRIDES") ?? undefined;
  const geminiModel = resolveGeminiModel(Deno.env.get("GEMINI_MODEL"));

  for (const provider of VISION_PROVIDERS) {
    const apiKey = Deno.env.get(provider.keyEnv);
    if (!apiKey) {
      console.log(`[vision] no key for ${provider.label}, skipping`);
      continue;
    }

    const model = provider.label === "gemini" ? geminiModel : provider.model;
    const sampling = geminiChatSampling(
      provider.label,
      model,
      opts.temperature ?? 0,
      tag,
      thinkingOverrides,
    );

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
            model,
            messages: opts.messages,
            max_tokens: opts.max_tokens ?? 4000,
            ...sampling,
          }),
        });

        if (resp.ok) {
          console.log(`[vision] using ${provider.label.toUpperCase()} (attempt ${attempt + 1})`);
          const data = await resp.json();
          const tokens = extractUsageTokens(data);
          logAiUsage({
            fn: tag,
            provider: provider.label,
            model,
            ok: true,
            status: resp.status,
            userId: opts.userId,
            promptTokens: tokens.promptTokens,
            completionTokens: tokens.completionTokens,
            totalTokens: tokens.totalTokens,
          });
          if (tokens.reasoningTokens !== null || tokens.cachedTokens !== null) {
            console.log(
              `[vision] ${provider.label} tokens in=${tokens.promptTokens} out=${tokens.completionTokens} thinking=${tokens.reasoningTokens} cached=${tokens.cachedTokens} total=${tokens.totalTokens}`,
            );
          }
          return data;
        }

        logAiUsage({
          fn: tag,
          provider: provider.label,
          model,
          ok: false,
          status: resp.status,
          userId: opts.userId,
        });

        await resp.text();
        console.warn(`[vision] ${provider.label} error ${resp.status}`);

        if (isTransient(resp.status) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        errors.push(`${provider.label}: HTTP ${resp.status}`);
        break; // errore non transitorio → prossimo fornitore
      } catch (err) {
        logAiUsage({
          fn: tag,
          provider: provider.label,
          model,
          ok: false,
          status: null,
          userId: opts.userId,
        });
        console.warn(`[vision] ${provider.label} network error:`, err);
        errors.push(`${provider.label}: network`);
        break;
      }
    }
  }

  throw new Error(`Tutti i provider vision non disponibili (${errors.join(" | ") || "nessuna chiave"})`);
}

/** Convenience: chiamata vision che restituisce solo il testo della risposta. */
export async function callVisionText(opts: VisionCallOptions, tag?: string): Promise<string> {
  const data = (await callVisionJson(opts, tag)) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || "";
}
