import type { LucideIcon } from "lucide-react";

/**
 * QuickToolsGrid — griglia degli strumenti rapidi.
 * Quattro capsule glass (rounded-full, estremità perfettamente semicircolari)
 * disposte 2×2 su telefono e 4 colonne da sm in su. Le etichette non vengono
 * MAI troncate: se serve, vanno a capo con interlinea compatta, così testi
 * come "Carica materiale" restano sempre leggibili per intero.
 * Materica: superficie translucida (.glass-tactile) + ombra tattile che si
 * approfondisce al passaggio del dito/mouse. Nessun colore primario.
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
              className="flex min-h-[52px] items-center gap-2.5 rounded-full border border-border glass-tactile px-4 py-2 text-left shadow-tactile transition-[box-shadow,transform] duration-200 ease-m3-standard hover:shadow-card-active active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
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
