/**
 * 🧺 P18 — Il parser delle parti della lezione (7 ottobre 2026).
 *
 * Viveva dentro FullscreenLesson: qui è una funzione PURA, collaudabile
 * senza montare il lettore. La logica è quella di sempre, con una cerniera
 * più larga: anche gli array con forma imperfetta (oggetti senza part_title
 * o pure stringhe) diventano parti con titolo di riserva — meglio un titolo
 * neutro che il JSON grezzo mostrato allo studente.
 */

export interface ExplanationPart {
  part_title: string;
  content: string;
  image_description?: string;
  image_url?: string;
}

/** Titoli di riserva quando l'AI non ha fornito titoli di parte. */
export const FALLBACK_LABELS = { explanation: "Spiegazione", part: (n: number) => `Parte ${n}` };

export function parseExplanationParts(
  explanation: string,
  labels: { explanation: string; part: (n: number) => string } = FALLBACK_LABELS,
): ExplanationPart[] {
  try {
    const parsed: unknown = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const parts: ExplanationPart[] = [];
      for (const item of parsed) {
        if (typeof item === "string" && item.trim()) {
          parts.push({ part_title: labels.part(parts.length + 1), content: item });
        } else if (
          item && typeof item === "object" &&
          typeof (item as Record<string, unknown>).content === "string" &&
          ((item as Record<string, unknown>).content as string).trim()
        ) {
          const obj = item as Record<string, unknown>;
          const title = typeof obj.part_title === "string" && obj.part_title.trim()
            ? obj.part_title
            : labels.part(parts.length + 1);
          parts.push({ part_title: title, content: obj.content as string });
        }
      }
      if (parts.length > 0) return parts;
    }
  } catch { /* not JSON */ }

  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: labels.explanation, content: explanation }];
  }

  const parts: ExplanationPart[] = [];
  let currentContent = "";
  let partIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentContent) {
        parts.push({ part_title: labels.part(partIndex + 1), content: currentContent.trim() });
        partIndex++;
      }
      currentContent = trimmed.replace(/^[•\-*]\s*/, "");
    } else {
      currentContent += (currentContent ? "\n" : "") + trimmed;
    }
  }
  if (currentContent) {
    parts.push({ part_title: labels.part(partIndex + 1), content: currentContent.trim() });
  }

  return parts.length > 0 ? parts : [{ part_title: labels.explanation, content: explanation }];
}
