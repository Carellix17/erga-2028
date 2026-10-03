import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import "katex/dist/katex.min.css";

/**
 * 🧭 PERCORSI 2.0 — IL MOTORE DI IMPAGINAZIONE UNICO DELLE LEZIONI.
 *
 * Markdown GFM (tabelle, elenchi, grassetti, box blockquote) + FORMULE
 * matematiche vere via KaTeX: $…$ inline e $$…$$ in mostra.
 * Chi non ha formule non cambia di una virgola: KaTeX entra in scena
 * solo quando il testo contiene i delimitatori.
 *
 * Errori LaTeX mai fatali: la formula imperfetta si mostra evidenziata,
 * il resto della lezione resta leggibile.
 */

interface LessonMarkdownProps {
  children?: string;
  /** Personalizzazioni (es. blockquote → box colorato del lettore). */
  components?: Components;
}

export function LessonMarkdown({ children, components }: LessonMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, errorColor: "#c83228" }]]}
      components={components}
    >
      {children ?? ""}
    </ReactMarkdown>
  );
}
