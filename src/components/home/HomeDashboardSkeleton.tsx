import { Skeleton } from "@/components/ui/skeleton";

/**
 * HomeDashboardSkeleton — scheletro di caricamento della Home.
 * Replica la struttura della nuova Home (header, card corso con anello,
 * griglia strumenti, card profilo cognitivo, piano del giorno) con le
 * stesse altezze, così l'arrivo dei dati non sposta nulla (zero CLS).
 */
export function HomeDashboardSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col gap-5 overflow-x-clip pt-16 pb-2"
      aria-busy="true"
      aria-label="Caricamento della Home"
    >
      {/* Header: saluto + sottotitolo + avatar */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-3/5 rounded-button" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      </header>

      {/* Card corso: titolo + anello, lezione, metadati, CTA */}
      <div className="rounded-card border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-6 w-1/2 rounded-button" />
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-button" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-12 w-full rounded-button" />
      </div>

      {/* Strumenti rapidi: titolo + griglia 2×2 */}
      <section className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-[52px] rounded-button" />
          <Skeleton className="h-[52px] rounded-button" />
          <Skeleton className="h-[52px] rounded-button" />
          <Skeleton className="h-[52px] rounded-button" />
        </div>
      </section>

      {/* Profilo cognitivo: badge + due colonne con esagono */}
      <div className="rounded-card border border-border bg-card p-5">
        <Skeleton className="h-6 w-36 rounded-pill" />
        <div className="mt-3 flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3 rounded-button" />
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
        </div>
      </div>

      {/* Piano del giorno: intestazione + due righe */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-6 w-20 rounded-button" />
          <Skeleton className="h-11 w-24 rounded-pill" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-[60px] w-full rounded-button" />
          <Skeleton className="h-[60px] w-full rounded-button" />
        </div>
      </div>
    </div>
  );
}
