import { LessonMarkdown } from "./LessonMarkdown";

/**
 * 🧭 PERCORSI 2.0 — RIGA DI TESTO CON FORMULE (domande, opzioni, affermazioni).
 *
 * Se il testo NON contiene "$" viene mostrato esattamente come prima
 * (zero cambiamenti visivi per le lezioni esistenti). Se contiene formule
 * LaTeX ($…$ o $$…$$) vengono impaginate da KaTeX in linea.
 */

interface MathTextProps {
  text?: string | null;
  className?: string;
}

export function MathText({ text, className }: MathTextProps) {
  const value = typeof text === "string" ? text : "";
  if (!value.includes("$")) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span className={className}>
      <span className="[&_p]:inline [&_.katex-display]:my-1">
        <LessonMarkdown components={{ p: "span" }}>{value}</LessonMarkdown>
      </span>
    </span>
  );
}
