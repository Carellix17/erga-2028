import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import "katex/dist/katex.min.css";
import { sanitizeWidgetSpec } from "@/lib/widgets";
import { LessonWidget } from "./widgets/LessonWidget";

/**
 * 🧭 PERCORSI 2.0 — IL MOTORE DI IMPAGINAZIONE UNICO DELLE LEZIONI.
 *
 * Markdown GFM (tabelle, elenchi, grassetti, box blockquote) + FORMULE
 * matematiche vere via KaTeX ($…$ inline, $$…$$ in mostra) + WIDGET
 * interattivi: un blocco di codice ```widget {"type":"parabola",…}```
 * diventa la simulazione corrispondente, con il bigliettino validato.
 *
 * Chi non ha formule né widget non cambia di una virgola. Errori mai
 * fatali: JSON del widget rotto o tipo sconosciuto → il blocco sparisce
 * e il resto della lezione resta leggibile.
 */

interface LessonMarkdownProps {
  children?: string;
  /** Personalizzazioni (es. blockquote → box colorato del lettore). */
  components?: Components;
}

/** Estrae il testo da children di un blocco code (di solito una stringa). */
function textOf(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textOf).join("");
  return "";
}

/** Riconosce un blocco ```widget … ``` dal className del <code>. */
function isWidgetBlock(className: unknown): boolean {
  return typeof className === "string" && className.includes("language-widget");
}

const baseComponents: Components = {
  code: ({ className, children, ...rest }) => {
    if (isWidgetBlock(className)) {
      try {
        const spec = sanitizeWidgetSpec(JSON.parse(textOf(children)));
        return spec ? <LessonWidget spec={spec} /> : null;
      } catch {
        return null; // JSON rotto: il blocco sparisce, la lezione continua
      }
    }
    return <code className={className} {...rest}>{children}</code>;
  },
  pre: ({ children }) => {
    // Il widget non va dentro un <pre>: lo facciamo passare pulito.
    const child = Array.isArray(children) ? children[0] : children;
    if (
      child &&
      typeof child === "object" &&
      "props" in (child as Record<string, unknown>) &&
      isWidgetBlock((child as { props?: { className?: unknown } }).props?.className)
    ) {
      return <>{child}</>;
    }
    return <pre>{children}</pre>;
  },
};

export function LessonMarkdown({ children, components }: LessonMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, errorColor: "#c83228" }]]}
      components={{ ...baseComponents, ...components }}
    >
      {children ?? ""}
    </ReactMarkdown>
  );
}
