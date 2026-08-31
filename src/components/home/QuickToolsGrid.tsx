import type { LucideIcon } from "lucide-react";

/**
 * QuickToolsGrid — griglia degli strumenti rapidi.
 * Quattro capsule (rounded-full, estremità perfettamente semicircolari)
 * disposte 2×2 su telefono e 4 colonne da sm in su. Le capsule restano
 * neutre: bordo sottile, superficie card, ombra leggera del design system.
 * Nessun colore primario (riservato alla CTA della card corso e
 * all'accento del profilo cognitivo).
 */

export interface QuickToolItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export interface QuickToolsGridProps {
  title?: string;
  tools: QuickToolItem[];
}

export function QuickToolsGrid({ title = "Strumenti rapidi", tools }: QuickToolsGridProps) {
  if (tools.length === 0) return null;

  return (
    <section aria-labelledby="quick-tools-title">
      <h2
        id="quick-tools-title"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={tool.onClick}
              className="flex min-h-[52px] items-center gap-2.5 rounded-full border border-border bg-card px-4 text-left shadow-level-1 transition-colors hover:bg-surface-container-high active:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 truncate text-[15px] font-medium text-foreground">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
