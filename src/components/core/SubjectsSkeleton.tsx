import { Skeleton } from "@/components/ui/skeleton";
import { CORE_CARD_CLASS } from "./CoreCard";

/**
 * SubjectsSkeleton — Tab 2: Materie & Interessi
 * 
 * Replica pixel-perfect di SubjectsInterestsEditor:
 * - 2 CoreCard (Materie + Interessi)
 * - Header con icona + titolo + descrizione
 * - Input h-11 + button h-11 w-11
 * - Flex-wrap di badge/pill h-9
 * - Suggerimenti con pill dashed
 */
export function SubjectsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Caricamento Materie e Interessi">
      {/* ── Card 1: Materie preferite ── */}
      <section className={`${CORE_CARD_CLASS} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-36 rounded-button" />
          </div>
        </div>
        <div className="mt-1.5">
          <Skeleton className="h-4 w-[85%] rounded-md" />
          <Skeleton className="h-3 w-3/5 rounded-md mt-2 opacity-70" />
        </div>

        <div className="mt-4 space-y-4">
          {/* Input + Button */}
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-button" />
            <Skeleton className="h-11 w-11 rounded-button shrink-0" />
          </div>

          {/* Badge / Pill skeletons — flex-wrap matching real tags */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-pill" />
            <Skeleton className="h-9 w-20 rounded-pill" />
            <Skeleton className="h-9 w-28 rounded-pill" />
            <Skeleton className="h-9 w-16 rounded-pill" />
            <Skeleton className="h-9 w-22 rounded-pill" />
            <Skeleton className="h-9 w-20 rounded-pill opacity-80" />
          </div>
        </div>
      </section>

      {/* ── Card 2: Interessi & hobby ── */}
      <section className={`${CORE_CARD_CLASS} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-32 rounded-button" />
          </div>
        </div>
        <div className="mt-1.5">
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-button" />
            <Skeleton className="h-11 w-11 rounded-button shrink-0" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20 rounded-pill" />
            <Skeleton className="h-9 w-24 rounded-pill" />
            <Skeleton className="h-9 w-16 rounded-pill" />
          </div>

          {/* Suggerimenti */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-pill border border-dashed border-border bg-transparent" />
            <Skeleton className="h-9 w-20 rounded-pill border border-dashed border-border bg-transparent" />
            <Skeleton className="h-9 w-14 rounded-pill border border-dashed border-border bg-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}
