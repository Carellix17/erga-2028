import type { LucideIcon } from "lucide-react";

/**
 * QuickToolsGrid — strumenti rapidi della Home (V2-01, DESIGN.md 2.1 §9).
 *
 * Card di strumenti (raggio card 24) su carta opaca con filetto: 2×2 su
 * telefono, 4 colonne da sm. L'icona in chip quieto, l'etichetta Inter
 * media che non tronca MAI: se serve va a capo con interlinea compatta.
 * Superfici solide: nessun blur (il velo satinato vive solo sulle
 * copertine dei corsi).
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
        className="text-[15px] font-semibold tracking-tight text-foreground"
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
              className="paper-grain flex min-h-[52px] items-center gap-2.5 rounded-card border border-border bg-card px-3 py-2 text-left shadow-tactile transition-[box-shadow,transform] duration-200 ease-m3-standard hover:shadow-card-active active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-surface-container-high">
                <Icon className="h-[18px] w-[18px] text-foreground" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-[15px] font-medium leading-tight text-foreground">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
