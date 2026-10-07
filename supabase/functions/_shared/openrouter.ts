/**
 * 🧠 PERCORSI 2.0 — IL CERVELLO SCIENTIFICO (DeepSeek V4 Flash via OpenRouter).
 *
 * Catena su OpenRouter:
 *   1. deepseek/deepseek-v4-flash (a pagamento: centesimi a lezione)
 *   2. …se proprio non va, il CHIAMANTE ricade sulla catena Gemini esistente.
 *
 * NOTA P3c (7 ottobre 2026): il vecchio primo gradino
 * "deepseek/deepseek-v4-flash:free" è STATO RIMOSSO: verificati live i 465
 * modelli pubblici di OpenRouter, NON esiste alcuna variante :free di
 * DeepSeek. Quel gradino rispondeva 404 e OGNI lezione scientifica partiva
 * con un tentativo sprecato (e ritardo) prima di cadere qui. Se un domani
 * OpenRouter aggiunge un gradino gratuito, va RI-verificato sui fatti.
 *
 * Regole:
 *  - NON lancia mai: restituisce null se la chiave manca o tutti i tentativi
 *    falliscono. La lezione deve poter nascere comunque.
 *  - Ogni tentativo finisce nel registro ai_usage (con token e durata):
 *    sapremo quanto costa davvero il cervello scientifico.
 *
 * La chiave vive SOLO nei segreti dell'ambiente (mai nel repository).
 */

import { logAiUsage } from "./aiUsage.ts";
import { extractUsageTokens } from "./usage.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Il gradino gratuito primo, poi quello a pagamento. */
export const OPENROUTER_MODEL_CHAIN = [
  "deepseek/deepseek-v4-flash:free",
  "deepseek/deepseek-v4-flash",
] as const;

/** Il nome del segreto scelto dal capo-cantiere (con alias di cortesia). */
export function openRouterKey(): string | null {
  return (
    Deno.env.get("OPENROUTER_SEPTEMBER_2026") ||
    Deno.env.get("OPENROUTER_API_KEY") ||
    null
  );
}

interface OpenRouterCallOptions {
  messages: { role: string; content: unknown }[];
  temperature?: number;
  maxTokens?: number;
  /** etichetta per il registro ai_usage (es. "generate-lessons"). */
  tag?: string;
  userId?: string;
}

/**
 * Prova la catena DeepSeek. Risolve con il testo della risposta, oppure con
 * null (chiave assente o modelli irraggiungibili) — mai con un'eccezione.
 */
export async function tryOpenRouterText(
  opts: OpenRouterCallOptions,
): Promise<string | null> {
  const apiKey = openRouterKey();
  if (!apiKey) {
    console.log("[2.0] Nessuna chiave OpenRouter: si usa la catena Gemini");
    return null;
  }

  for (const model of OPENROUTER_MODEL_CHAIN) {
    const startedAt = Date.now();
    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Title": "Erga",
        },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.35,
          max_tokens: opts.maxTokens ?? 4000,
        }),
      });

      const durationMs = Date.now() - startedAt;

      if (resp.ok) {
        const data = await resp.json();
        const choice = data?.choices?.[0];
        const text = choice?.message?.content;
        const tokens = extractUsageTokens(data);
        logAiUsage({
          fn: opts.tag ?? null,
          provider: "openrouter",
          model,
          ok: true,
          status: resp.status,
          userId: opts.userId,
          durationMs,
          ...tokens,
        });
        if (typeof text === "string" && text.trim()) {
          // ✂️ P3b: risposta tagliata dal limite di token → non è una lezione
          // buona: si lascia perdere e si scivola sul paracadute Gemini
          // (che riprova con più token). Meglio rigenerare che salvare metà JSON.
          if (choice?.finish_reason === "length") {
            console.warn(`[2.0] ${model}: risposta troncata (finish_reason=length) → paracadute Gemini`);
            continue;
          }
          console.log(`[2.0] Lezione scientifica via ${model}`);
          return text;
        }
        console.warn(`[2.0] ${model}: risposta vuota, provo il gradino dopo`);
        continue;
      }

      const errBody = await resp.text();
      logAiUsage({
        fn: opts.tag ?? null,
        provider: "openrouter",
        model,
        ok: false,
        status: resp.status,
        userId: opts.userId,
        durationMs,
      });
      console.warn(
        `[2.0] ${model} errore ${resp.status}: ${errBody.substring(0, 200)} → provo il gradino dopo`,
      );
    } catch (err) {
      logAiUsage({
        fn: opts.tag ?? null,
        provider: "openrouter",
        model,
        ok: false,
        status: null,
        userId: opts.userId,
      });
      console.warn(`[2.0] ${model} errore di rete:`, err);
    }
  }

  console.warn("[2.0] DeepSeek non raggiungibile: servire il paracadute Gemini");
  return null;
}
