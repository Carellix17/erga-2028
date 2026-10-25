import { Skeleton } from "@/components/ui/skeleton";

/**
 * Scheletro della Home: ripete l'ordine reale delle sezioni e le misure
 * responsive, evitando salti quando arrivano corso, profilo e attività.
 */
export function HomeDashboardSkeleton() {
  return (
    <div className="min-w-0 pt-16 pb-4" aria-busy="true" aria-label="Caricamento della Home">
      <header className="mb-4 flex items-start gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-[2.35rem] w-3/5 rounded-xl sm:h-[2.9rem] lg:h-[3.5rem]" />
          <Skeleton className="h-[2.35rem] w-2/5 rounded-xl sm:h-[2.9rem] lg:h-[3.5rem]" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-4">
        {/* Percorso da riprendere: titolo, lezione, progressione e CTA. */}
        <div className="min-w-0 border border-border bg-card p-5 sm:p-6">
          <Skeleton className="h-8 w-1/2 max-w-[22ch]" />
          <Skeleton className="mt-3 h-6 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-6 h-1 w-full" />
          <Skeleton className="mt-4 h-12 w-full sm:w-48" />
        </div>

        {/* Esagono senza card e accessi alla pratica affiancati. */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-3 sm:gap-4 lg:max-w-xl">
          <div className="min-w-0">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mx-auto mt-2 h-36 w-full max-w-[13rem]" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Caricamento materiali e Chat, subito sotto il gruppo di pratica. */}
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Piano del giorno, in colonna singola. */}
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2.5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-11 w-24" />
          </div>
          <div className="space-y-2 px-2 pb-2 sm:px-2.5">
            <Skeleton className="h-[60px] w-full" />
            <Skeleton className="h-[60px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
