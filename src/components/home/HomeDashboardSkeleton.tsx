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
      className="flex min-w-0 flex-col gap-6 overflow-x-clip pt-20 pb-2 sm:pt-28"
      aria-busy="true"
      aria-label="Caricamento della Home"
    >
      {/* Header: saluto su due righe (saluto + nome) + sottotitolo + avatar.
          Ogni barra è alta quanto una riga del titolo dopo la riduzione del 20%
          (43.2 → 70.4 → 76.8 → 86.4px, ×1.05 di interlinea).
          Il mb-4 replica il respiro del HomeHeader reale: al termine del
          caricamento nulla si sposta. */}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-[2.35rem] w-3/5 rounded-xl sm:h-[2.9rem] lg:h-[3.5rem]" />
          <Skeleton className="h-[2.35rem] w-2/5 rounded-xl sm:h-[2.9rem] lg:h-[3.5rem]" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-[14px]" />
      </header>

      {/* Card corso: titolo + anello, lezione, metadati, CTA */}
      <div className="rounded-hero border border-border bg-card p-5 shadow-level-3 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-16 shrink-0" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="mt-5 h-12 w-full rounded-pill" />
      </div>

      {/* Strumenti rapidi: titolo + griglia 2×2 */}
      <section className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-[52px]" />
          <Skeleton className="h-[52px]" />
          <Skeleton className="h-[52px]" />
          <Skeleton className="h-[52px]" />
        </div>
      </section>

      {/* Profilo cognitivo: badge + due colonne con esagono */}
      <div className="border border-[#FFFBF4] bg-card p-5">
        <Skeleton className="h-6 w-36" />
        <div className="mt-3 flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-20 w-20 shrink-0" />
        </div>
      </div>

      {/* Piano del giorno: intestazione + due righe */}
      <div className="border border-[#FFFBF4] bg-card p-4">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      </div>
    </div>
  );
}
