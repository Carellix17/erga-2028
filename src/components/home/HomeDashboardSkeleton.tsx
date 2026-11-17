import { Skeleton } from "@/components/ui/skeleton";

/**
 * Scheletro della Home: ripete l'ordine reale delle sezioni e le misure
 * responsive, evitando salti quando arrivano corso e attività.
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
        <div className="min-w-0 rounded-[24px] border border-[#212327] bg-[#FFFBF4] p-5 sm:p-6">
          <Skeleton className="h-8 w-1/2 max-w-[22ch]" />
          <Skeleton className="mt-3 h-6 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-6 h-1 w-full" />
          <Skeleton className="mt-4 h-12 w-full sm:w-48" />
        </div>

        <div className="rounded-[24px] border border-[#212327] bg-[#FFFBF4] p-5 sm:p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-[60px] w-full rounded-[24px]" />
          <Skeleton className="mt-2 h-[60px] w-full rounded-[24px]" />
          <Skeleton className="mt-4 h-12 w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}
