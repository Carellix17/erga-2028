import { Skeleton } from "@/components/ui/skeleton";

/**
 * StudyPlanSkeleton — Piano di studio (PianoView)
 * Replica pixel-perfect:
 * - Bottone genera piano h-14 flex-[2] + focus h-14 flex-[1] gap-3
 * - Card calendario m3-card-elevated rounded-card p-4 con toggle mese/settimana h-9 rounded-full
 * - Griglia calendario h-72
 * - Lista TaskRow: h-20 rounded-card x3
 */
export function StudyPlanSkeleton() {
  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-up" aria-busy="true" aria-label="Caricamento Piano di Studio">
      {/* Header azioni */}
      <div className="flex flex-row gap-3 w-full">
        <Skeleton className="flex-[2] h-14 rounded-button" />
        <Skeleton className="flex-[1] h-14 rounded-button" />
      </div>

      {/* Calendario */}
      <div className="m3-card-elevated rounded-card p-4 space-y-3">
        <div className="flex justify-center mb-2">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface-container">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
        {/* Header mese */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-button" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Giorni settimana */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-6 rounded-pill mx-auto" />
          ))}
        </div>
        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* WeekPlanner */}
      <div className="rounded-card border border-border bg-card p-3 space-y-2">
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Task list */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-24 rounded-button" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-card p-4 flex gap-3 items-center">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-button" />
              <Skeleton className="h-3 w-1/2 rounded-full opacity-70" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskRowSkeleton() {
  return (
    <div className="rounded-card border border-border bg-card p-4 flex gap-3 items-center animate-pulse" aria-hidden="true">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-button" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );
}
