import { Skeleton } from "@/components/ui/skeleton";

/**
 * ModulePathSkeleton — replica del percorso SERPENTINA del modulo
 * 🌀 P46: nodi TONDI su tre colonne (centro-sinistra → centro → centro-destra),
 * curva morbida fra i nodi, schede del titolo ACCANTO ai nodi, nodo speciale
 * del test finale. Serve solo a non far "saltare" l'occhio mentre i dati
 * arrivano: la geometria segue quella vera in ModulePath.tsx.
 * Header con back button + titolo modulo.
 */
const NODE = 56;
const STEP = 132;
const COL_A = 25;
const COL_B = 50;
const COL_C = 75;
const SERPENTINE = [COL_A, COL_B, COL_C, COL_B];

export function ModulePathSkeleton() {
  return (
    <div className="px-4 pt-6 pb-32 space-y-8 animate-fade-up" aria-busy="true" aria-label="Caricamento Modulo">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-pill" />
          <Skeleton className="h-6 w-40 rounded-button" />
        </div>
      </div>

      {/* Percorso */}
      <div className="relative mx-2" style={{ height: 5 * STEP + 40 }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const col = SERPENTINE[i % SERPENTINE.length];
          const side = col === COL_A ? "right" : col === COL_C ? "left" : i % 4 === 1 ? "left" : "right";
          const offset = NODE / 2 + 12;
          return (
            <div key={i} className="absolute inset-x-0" style={{ top: i * STEP + NODE / 2 - STEP / 2, height: STEP }}>
              {/* Nodo tondo */}
              <Skeleton
                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `calc(${col}% - ${NODE / 2}px)`,
                  width: NODE,
                  height: NODE,
                }}
              />
              {/* Scheda del titolo accanto al nodo */}
              <div
                className="absolute top-1/2 -translate-y-1/2 space-y-2 rounded-xl border border-border bg-card px-3.5 py-2.5"
                style={{
                  ...(side === "right" ? { left: `calc(${col}% + ${offset}px)` } : { right: `calc(${100 - col}% + ${offset}px)` }),
                  width: col === COL_B ? "min(34%, 150px)" : "min(48%, 168px)",
                  maxWidth: col === COL_B ? "min(34%, 150px)" : "min(48%, 168px)",
                }}
              >
                <Skeleton className="h-2.5 w-12 rounded-pill opacity-70" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
