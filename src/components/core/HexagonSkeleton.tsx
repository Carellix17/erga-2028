import { Skeleton } from "@/components/ui/skeleton";
import { CORE_CARD_CLASS } from "./CoreCard";

/**
 * HexagonSkeleton — Tab 1: Esagono Cognitivo
 * 
 * Obiettivo: zero CLS (Cumulative Layout Shift)
 * - Stesse dimensioni del contenuto reale: header, radar h-72, griglia 3 colonne, bottone h-12
 * - Usa CORE_CARD_CLASS per materiale identico alla card reale (rounded-card, border, bg-card, shadow-level-1)
 * - Mostrato SOLO durante isLoading iniziale
 */
export function HexagonSkeleton() {
  return (
    <section
      className={`${CORE_CARD_CLASS} p-5`}
      aria-busy="true"
      aria-label="Caricamento Esagono Cognitivo"
    >
      {/* Header: icona + titolo + descrizione */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-5 w-36 rounded-button" />
        </div>
      </div>
      <div className="mt-1.5 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md opacity-70" />
      </div>

      {/* Contenuto */}
      <div className="mt-4 space-y-4">
        {/* Radar Chart placeholder: h-72 esatto come CognitiveRadar */}
        <div className="w-full h-72 flex items-center justify-center">
          <div className="relative">
            {/* Esagono/cerchio esterno */}
            <Skeleton className="h-56 w-56 rounded-full" />
            {/* Anello interno per simulare la griglia radar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-36 w-36 rounded-full border border-border/50" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border border-border/30" />
            </div>
            {/* Punti cardinali finti */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
              <Skeleton className="h-3 w-8 rounded-pill" />
            </div>
            <div className="absolute top-1/2 -right-2 -translate-y-1/2">
              <Skeleton className="h-3 w-10 rounded-pill" />
            </div>
          </div>
        </div>

        {/* Metric breakdown: grid-cols-3 gap-2 identica al reale */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-button bg-surface-container-high py-2.5 px-2 flex flex-col items-center gap-1.5"
            >
              <Skeleton className="h-3 w-10 rounded-pill" />
              <Skeleton className="h-5 w-8 rounded-md" />
            </div>
          ))}
        </div>

        {/* Bottone finale h-12 w-full */}
        <Skeleton className="h-12 w-full rounded-button" />
      </div>
    </section>
  );
}
