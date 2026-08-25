import { Skeleton } from "@/components/ui/skeleton";

/**
 * FocusStatsSkeleton — per FocusStatsDashboard
 * Replica metriche focus, streak, grafici
 */
export function FocusStatsSkeleton() {
  return (
    <div className="space-y-6 p-4 pb-28 animate-fade-up" aria-busy="true" aria-label="Caricamento Statistiche Focus">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-button" />
        <Skeleton className="h-4 w-64 rounded-full opacity-70" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-20 rounded-pill" />
          <Skeleton className="h-8 w-16 rounded-button" />
          <Skeleton className="h-3 w-24 rounded-full opacity-60" />
        </div>
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-20 rounded-pill" />
          <Skeleton className="h-8 w-16 rounded-button" />
          <Skeleton className="h-3 w-24 rounded-full opacity-60" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-card" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-button" />
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
      </div>
    </div>
  );
}
