// Helpers to enforce output language for AI prompts.
// Client passes `language` ("it" | "en" | ...) in the request body.

const LANG_NAMES: Record<string, string> = {
  it: "italiano",
  en: "English",
};

export function normalizeLanguage(input: unknown): "it" | "en" {
  const v = typeof input === "string" ? input.slice(0, 2).toLowerCase() : "";
  return v === "en" ? "en" : "it";
}

/** Human-readable name in the target language ("italiano", "English"). */
export function languageName(lang: "it" | "en"): string {
  return LANG_NAMES[lang] ?? "italiano";
}

/** A single-line directive that must be prepended to every AI prompt. */
export function languageDirective(lang: "it" | "en"): string {
  return lang === "en"
    ? "OUTPUT LANGUAGE: You MUST write ALL content, titles, questions, options and explanations in English."
    : "LINGUA DI OUTPUT: Devi scrivere TUTTI i contenuti, titoli, domande, opzioni e spiegazioni in italiano.";
}