import { describe, it, expect } from "vitest";
import { extractUsageTokens } from "../../supabase/functions/_shared/usage";

// 🧾 PACCHETTO 1 — collaudo dell'estrazione token dal "dialetto OpenAI"
// parlato da tutti i provider (Gemini OpenAI-compat, OpenAI, Groq, gateway)
// e dal usageMetadata nativo di generateContent.

const none = { reasoningTokens: null, cachedTokens: null };

describe("🧾 extractUsageTokens — il registro dei costi", () => {
  it("legge i token dalla forma OpenAI classica", () => {
    expect(
      extractUsageTokens({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1200, completion_tokens: 800, total_tokens: 2000 },
      }),
    ).toEqual({ promptTokens: 1200, completionTokens: 800, totalTokens: 2000, ...none });
  });

  it("somma le parti quando manca il totale", () => {
    expect(
      extractUsageTokens({ usage: { prompt_tokens: 100, completion_tokens: 50 } }),
    ).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150, ...none });
  });

  it("non inventa le parti quando c'è solo il totale", () => {
    expect(extractUsageTokens({ usage: { total_tokens: 500 } })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: 500,
      ...none,
    });
  });

  it("non inventa i token di pensiero dalla differenza fra totale e parti", () => {
    expect(
      extractUsageTokens({
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 40 },
      }),
    ).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 40, ...none });
  });

  it("legge reasoning e cache quando il dialetto OpenAI li espone", () => {
    expect(
      extractUsageTokens({
        usage: {
          prompt_tokens: 1486,
          completion_tokens: 651,
          total_tokens: 2137,
          prompt_tokens_details: { cached_tokens: 1408, audio_tokens: 0 },
          completion_tokens_details: { reasoning_tokens: 512, audio_tokens: 0 },
        },
      }),
    ).toEqual({
      promptTokens: 1486,
      completionTokens: 651,
      totalTokens: 2137,
      reasoningTokens: 512,
      cachedTokens: 1408,
    });
  });

  it("legge usageMetadata nativo di generateContent", () => {
    expect(
      extractUsageTokens({
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
        usageMetadata: {
          promptTokenCount: 1680,
          candidatesTokenCount: 90,
          thoughtsTokenCount: 12,
          cachedContentTokenCount: 560,
          totalTokenCount: 1782,
        },
      }),
    ).toEqual({
      promptTokens: 1680,
      completionTokens: 90,
      totalTokens: 1782,
      reasoningTokens: 12,
      cachedTokens: 560,
    });
  });

  it("accetta anche i nomi snake_case del metadata nativo", () => {
    expect(
      extractUsageTokens({
        usage_metadata: {
          prompt_token_count: 4,
          candidates_token_count: 6,
          thoughts_token_count: 0,
          cached_content_token_count: 1,
          total_token_count: 10,
        },
      }),
    ).toEqual({
      promptTokens: 4,
      completionTokens: 6,
      totalTokens: 10,
      reasoningTokens: 0,
      cachedTokens: 1,
    });
  });

  it("completa dal metadata nativo solo i campi che l'oggetto usage non ha", () => {
    expect(
      extractUsageTokens({
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 40 },
        usageMetadata: { thoughtsTokenCount: 12, cachedContentTokenCount: 3, promptTokenCount: 999 },
      }),
    ).toEqual({
      promptTokens: 20,
      completionTokens: 8,
      totalTokens: 40,
      reasoningTokens: 12,
      cachedTokens: 3,
    });
  });

  it("tollera risposte senza usage (provider avaro → campi null)", () => {
    expect(extractUsageTokens({ choices: [] })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      ...none,
    });
  });

  it("tollera input spazzatura senza mai lanciare", () => {
    expect(extractUsageTokens(null)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null, ...none });
    expect(extractUsageTokens("testo")).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null, ...none });
    expect(extractUsageTokens({ usage: "non-un-oggetto" })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      ...none,
    });
  });

  it("rifiuta numeri non validi (NaN, negativi, stringhe)", () => {
    expect(
      extractUsageTokens({
        usage: { prompt_tokens: "1200", completion_tokens: -3, total_tokens: Number.NaN },
        usageMetadata: { thoughtsTokenCount: -1, cachedContentTokenCount: "2" },
      }),
    ).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null, ...none });
  });

  it("arrotonda i decimali al token intero", () => {
    expect(
      extractUsageTokens({ usage: { prompt_tokens: 10.4, completion_tokens: 20.6 } }),
    ).toEqual({ promptTokens: 10, completionTokens: 21, totalTokens: 31, ...none });
  });
});
