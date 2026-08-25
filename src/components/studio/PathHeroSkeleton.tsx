import { Skeleton } from "@/components/ui/skeleton";

/**
 * PathHeroSkeleton — replica di PathHero
 * - Banner completo con progress bar, titolo, bottoni Riprendi + Cambia corso
 * - h-auto con padding p-5 sm:p-6, rounded-card
 */
export function PathHeroSkeleton() {
  return (
    <div className="rounded-card border border-border bg-card p-5 sm:p-6 space-y-4 animate-pulse" aria-busy="true" aria-label="Caricamento Percorso">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20 rounded-pill" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4 rounded-button" />
        <Skeleton className="h-4 w-1/2 rounded-full opacity-70" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-button" />
        <Skeleton className="h-11 w-24 rounded-button" />
        <Skeleton className="h-11 w-11 rounded-button" />
      </div>
    </div>
  );
}
