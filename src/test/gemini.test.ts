import { describe, expect, it } from "vitest";
import {
  GEMINI_MODEL_DEFAULT,
  GEMINI_MODEL_ROLLBACK,
  GEMINI_PDF_FALLBACK_MODEL,
  geminiChatSampling,
  geminiNativeGenerationConfig,
  isGemini3Model,
  resolveGeminiModel,
  resolveGeminiThinkingLevel,
} from "../../supabase/functions/_shared/gemini";

describe("modello Gemini", () => {
  it("il default è l'id ufficiale gemini-3.5-flash-lite, con via di ritorno", () => {
    expect(GEMINI_MODEL_DEFAULT).toBe("gemini-3.5-flash-lite");
    expect(GEMINI_MODEL_ROLLBACK).toBe("gemini-2.5-flash");
    expect(GEMINI_PDF_FALLBACK_MODEL).toBe("gemini-2.5-flash-lite");
    expect(resolveGeminiModel(undefined)).toBe(GEMINI_MODEL_DEFAULT);
    expect(resolveGeminiModel("  ")).toBe(GEMINI_MODEL_DEFAULT);
    expect(resolveGeminiModel("gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("riconosce solo la famiglia 3, anche con prefisso google/ o models/", () => {
    expect(isGemini3Model("gemini-3.5-flash-lite")).toBe(true);
    expect(isGemini3Model("google/gemini-3.5-flash-lite")).toBe(true);
    expect(isGemini3Model("models/gemini-3-flash-preview")).toBe(true);
    expect(isGemini3Model("gemini-2.5-flash")).toBe(false);
    expect(isGemini3Model("gemini-2.5-flash-lite")).toBe(false);
    expect(isGemini3Model("google/gemini-2.5-flash")).toBe(false);
    expect(isGemini3Model("gpt-4o-mini")).toBe(false);
  });
});

describe("niente temperature su Gemini 3", () => {
  it("sul provider gemini 3.x toglie la temperatura e mette reasoning_effort", () => {
    expect(
      geminiChatSampling("gemini", "gemini-3.5-flash-lite", 0.7, "chat", null),
    ).toEqual({ reasoning_effort: "low" });
    expect(
      geminiChatSampling("gemini", "google/gemini-3.5-flash-lite", 0, "extract-pdf", null),
    ).toEqual({ reasoning_effort: "minimal" });
  });

  it("su Gemini 2.5 tiene la temperatura, anche quando è zero", () => {
    expect(geminiChatSampling("gemini", "gemini-2.5-flash", 0, "extract-pdf", null)).toEqual({
      temperature: 0,
    });
    expect(geminiChatSampling("gemini", GEMINI_MODEL_ROLLBACK, 0.7, "chat", null)).toEqual({
      temperature: 0.7,
    });
  });

  it("lascia la temperatura a OpenAI, Groq e al gateway Lovable", () => {
    for (const provider of ["openai", "groq", "lovable-gateway"]) {
      expect(
        geminiChatSampling(provider, "gemini-3.5-flash-lite", 0.4, "generate-lessons", null),
      ).toEqual({ temperature: 0.4 });
    }
    expect(
      geminiChatSampling("lovable-gateway", "google/gemini-2.5-flash", 0, "extract-lesson-figures", null),
    ).toEqual({ temperature: 0 });
  });

  it("sul generateContent nativo omette la temperatura e imposta thinkingLevel", () => {
    expect(
      geminiNativeGenerationConfig({
        model: "gemini-3.5-flash-lite",
        maxOutputTokens: 30000,
        temperature: 0,
        fn: "extract-pdf",
      }),
    ).toEqual({
      maxOutputTokens: 30000,
      thinkingConfig: { thinkingLevel: "minimal" },
    });
  });

  it("sul generateContent 2.x lascia la temperatura e non manda thinkingLevel", () => {
    const config = geminiNativeGenerationConfig({
      model: "gemini-2.5-flash-lite",
      maxOutputTokens: 30000,
      temperature: 0,
      fn: "extract-pdf",
    });
    expect(config).toEqual({ maxOutputTokens: 30000, temperature: 0 });
    expect(config).not.toHaveProperty("thinkingConfig");
  });
});

describe("ragionamento per funzione", () => {
  it("usa medium per lezioni e interrogazione, low per la chat, minimal per l'OCR", () => {
    expect(resolveGeminiThinkingLevel("generate-lessons")).toBe("medium");
    expect(resolveGeminiThinkingLevel("generate-lessons-demo")).toBe("medium");
    expect(resolveGeminiThinkingLevel("interrogazione")).toBe("medium");
    expect(resolveGeminiThinkingLevel("generate-exercises")).toBe("medium");
    expect(resolveGeminiThinkingLevel("chat")).toBe("low");
    expect(resolveGeminiThinkingLevel("lesson-chat")).toBe("low");
    expect(resolveGeminiThinkingLevel("extract-pdf")).toBe("minimal");
    expect(resolveGeminiThinkingLevel("extract-lesson-figures")).toBe("minimal");
  });

  it("senza etichetta resta su low, non sul minimal del modello", () => {
    expect(resolveGeminiThinkingLevel(undefined)).toBe("low");
    expect(resolveGeminiThinkingLevel("  ")).toBe("low");
    expect(resolveGeminiThinkingLevel("funzione-nuova")).toBe("low");
  });

  it("una override per funzione vince sul default e ignora i pezzi illeggibili", () => {
    const raw = "chat=high, extract-pdf = low, generate-lessons=turbo, rotto, =minimal";
    expect(resolveGeminiThinkingLevel("chat", raw)).toBe("high");
    expect(resolveGeminiThinkingLevel("extract-pdf", raw)).toBe("low");
    expect(resolveGeminiThinkingLevel("generate-lessons", raw)).toBe("medium");
    expect(
      geminiChatSampling("gemini", GEMINI_MODEL_DEFAULT, 0.7, "chat", "chat=minimal"),
    ).toEqual({ reasoning_effort: "minimal" });
    expect(
      geminiNativeGenerationConfig({
        model: GEMINI_MODEL_DEFAULT,
        maxOutputTokens: 1024,
        fn: "interrogazione",
        thinkingOverrides: "interrogazione=high",
      }),
    ).toEqual({
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: "high" },
    });
  });
});
