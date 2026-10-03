import { describe, it, expect } from "vitest";
import { extractUsageTokens } from "../../supabase/functions/_shared/usage";

// 🧾 PACCHETTO 1 — collaudo dell'estrazione token dal "dialetto OpenAI"
// parlato da tutti i provider (Gemini OpenAI-compat, OpenAI, Groq, gateway).

describe("🧾 extractUsageTokens — il registro dei costi", () => {
  it("legge i token dalla forma OpenAI classica", () => {
    expect(
      extractUsageTokens({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1200, completion_tokens: 800, total_tokens: 2000 },
      }),
    ).toEqual({ promptTokens: 1200, completionTokens: 800, totalTokens: 2000 });
  });

  it("somma le parti quando manca il totale", () => {
    expect(
      extractUsageTokens({ usage: { prompt_tokens: 100, completion_tokens: 50 } }),
    ).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
  });

  it("non inventa le parti quando c'è solo il totale", () => {
    expect(extractUsageTokens({ usage: { total_tokens: 500 } })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: 500,
    });
  });

  it("tollera risposte senza usage (provider avaro → campi null)", () => {
    expect(extractUsageTokens({ choices: [] })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
  });

  it("tollera input spazzatura senza mai lanciare", () => {
    expect(extractUsageTokens(null)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null });
    expect(extractUsageTokens("testo")).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null });
    expect(extractUsageTokens({ usage: "non-un-oggetto" })).toEqual({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
  });

  it("rifiuta numeri non validi (NaN, negativi, stringhe)", () => {
    expect(
      extractUsageTokens({ usage: { prompt_tokens: "1200", completion_tokens: -3, total_tokens: Number.NaN } }),
    ).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null });
  });

  it("arrotonda i decimali al token intero", () => {
    expect(
      extractUsageTokens({ usage: { prompt_tokens: 10.4, completion_tokens: 20.6 } }),
    ).toEqual({ promptTokens: 10, completionTokens: 21, totalTokens: 31 });
  });
});
