import { Skeleton } from "@/components/ui/skeleton";
import { CORE_CARD_CLASS } from "./CoreCard";
import { ROUTINE_GRID_HEIGHT, ROUTINE_ROW_H } from "@/lib/routineLayout";

/**
 * RoutineSkeleton — Tab 3: Planning Routine
 * 
 * Replica pixel-perfect di WeeklyRoutineEditor per zero CLS:
 * - CoreCard con header + descrizione + bottone "Aggiungi blocco" h-11
 * - Day picker strip: 7 pill h-11 rounded-full
 * - Griglia con ROUTINE_GRID_HEIGHT identica al reale (24 * 48px)
 * - 2-3 placeholder cards con time badge + text lines
 */
export function RoutineSkeleton() {
  // Altezze reali per match perfetto
  const gridHeight = ROUTINE_GRID_HEIGHT; // 1152px
  // Per lo skeleton mostriamo solo una porzione visibile iniziale per non creare pagina infinita,
  // ma manteniamo la struttura della griglia. Usiamo 480px visibili con overflow nascosto
  // + placeholder blocks posizionati come quelli reali per evitare CLS sul primo viewport.
  const visibleHeight = 480;

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Caricamento Planning Routine">
      <section className={`${CORE_CARD_CLASS} p-5`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-20 rounded-button" />
          </div>
          <Skeleton className="h-11 w-32 rounded-pill shrink-0" />
        </div>
        <div className="mt-1.5 space-y-1.5">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md opacity-80" />
        </div>

        {/* Contenuto griglia */}
        <div className="mt-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 overflow-hidden">
          {/* Mobile: day picker 7 pill */}
          <div className="md:hidden flex items-center justify-between gap-1 px-3 pt-3 pb-2 border-b border-muted">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`m-${i}`} className="flex-1 h-11 rounded-full" />
            ))}
          </div>

          {/* Desktop: header giorni */}
          <div className="hidden md:block">
            <div className="grid border-b border-muted" style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}>
              <div />
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={`d-h-${i}`} className="flex justify-center py-2">
                  <Skeleton className="h-3 w-6 rounded-pill" />
                </div>
              ))}
            </div>
          </div>

          {/* Griglia ore + blocchi */}
          <div className="relative">
            {/* Desktop grid */}
            <div className="hidden md:block overflow-hidden">
              <div className="min-w-[560px]">
                <div className="grid relative" style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}>
                  {/* Colonna ore */}
                  <div className="relative" style={{ height: visibleHeight }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 flex justify-end pr-1"
                        style={{ top: i * ROUTINE_ROW_H }}
                      >
                        <Skeleton className="h-2.5 w-8 rounded-pill opacity-60" />
                      </div>
                    ))}
                    {/* Linee orarie */}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={`line-${i}`}
                        className="absolute left-0 right-0 border-b border-muted/50"
                        style={{ top: i * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
                      />
                    ))}
                  </div>

                  {/* 7 colonne giorni con blocchi finti */}
                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                    <div key={dayIdx} className="relative border-l border-muted" style={{ height: visibleHeight }}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-b border-muted/30"
                          style={{ top: i * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Blocchi routine finti posizionati come quelli reali */}
                  {/* Lun 8-10 */}
                  <div
                    className="absolute rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{
                      left: "calc(44px + (100% - 44px) / 7 * 0 + 4px)",
                      width: "calc((100% - 44px) / 7 - 8px)",
                      top: 8 * ROUTINE_ROW_H + 2,
                      height: 2 * ROUTINE_ROW_H - 4,
                    }}
                  >
                    <Skeleton className="h-3 w-12 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-full rounded-md mb-1" />
                    <Skeleton className="h-2.5 w-3/4 rounded-md opacity-70" />
                  </div>
                  {/* Mar 14-16 */}
                  <div
                    className="absolute rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{
                      left: "calc(44px + (100% - 44px) / 7 * 1 + 4px)",
                      width: "calc((100% - 44px) / 7 - 8px)",
                      top: 14 * ROUTINE_ROW_H + 2,
                      height: 2 * ROUTINE_ROW_H - 4,
                    }}
                  >
                    <Skeleton className="h-3 w-10 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-full rounded-md" />
                  </div>
                  {/* Ven 9-11 */}
                  <div
                    className="absolute rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{
                      left: "calc(44px + (100% - 44px) / 7 * 4 + 4px)",
                      width: "calc((100% - 44px) / 7 - 8px)",
                      top: 9 * ROUTINE_ROW_H + 2,
                      height: 2 * ROUTINE_ROW_H - 4,
                    }}
                  >
                    <Skeleton className="h-3 w-14 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-5/6 rounded-md mb-1" />
                    <Skeleton className="h-2.5 w-2/3 rounded-md opacity-70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile grid */}
            <div className="md:hidden">
              <div className="grid relative" style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}>
                <div className="relative" style={{ height: visibleHeight }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 flex justify-end pr-1"
                      style={{ top: i * ROUTINE_ROW_H }}
                    >
                      <Skeleton className="h-2.5 w-8 rounded-pill opacity-60" />
                    </div>
                  ))}
                </div>
                <div className="relative border-l border-muted" style={{ height: visibleHeight }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-b border-muted/30"
                      style={{ top: i * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
                    />
                  ))}

                  {/* 3 blocchi mobile */}
                  <div
                    className="absolute left-1 right-1 rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{ top: 8 * ROUTINE_ROW_H + 2, height: 2 * ROUTINE_ROW_H - 4 }}
                  >
                    <Skeleton className="h-3 w-12 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                  </div>
                  <div
                    className="absolute left-1 right-1 rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{ top: 14 * ROUTINE_ROW_H + 2, height: 2 * ROUTINE_ROW_H - 4 }}
                  >
                    <Skeleton className="h-3 w-10 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-2/3 rounded-md" />
                  </div>
                  <div
                    className="absolute left-1 right-1 rounded-xl border border-border bg-card p-2 shadow-sm"
                    style={{ top: 18 * ROUTINE_ROW_H + 2, height: 96 - 4 }}
                  >
                    <Skeleton className="h-3 w-14 rounded-pill mb-1.5" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-muted bg-muted/30 flex gap-2">
            <Skeleton className="h-3 w-24 rounded-pill" />
            <Skeleton className="h-3 w-32 rounded-pill opacity-60" />
          </div>
        </div>
      </section>
    </div>
  );
}
