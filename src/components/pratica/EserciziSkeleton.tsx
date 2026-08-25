import { Skeleton } from "@/components/ui/skeleton";
import { CORE_CARD_CLASS } from "@/components/core/CoreCard";

/**
 * EserciziSkeleton — per EserciziView
 * Copre: menu, generazione, storia, lezione picker, esercizio singolo
 */

export function EserciziMenuSkeleton() {
  return (
    <div className="space-y-4 p-4 pb-28 animate-fade-up" aria-busy="true" aria-label="Caricamento Esercizi">
      <Skeleton className="h-8 w-48 rounded-button" />
      <div className="grid gap-3">
        <div className={`${CORE_CARD_CLASS} p-5 flex gap-4 items-center`}>
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-button" />
            <Skeleton className="h-4 w-1/2 rounded-full opacity-70" />
          </div>
        </div>
        <div className={`${CORE_CARD_CLASS} p-5 flex gap-4 items-center`}>
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 rounded-button" />
            <Skeleton className="h-4 w-1/2 rounded-full opacity-70" />
          </div>
        </div>
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-32 rounded-button" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
    </div>
  );
}

export function EserciziGenerationSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center animate-fade-up" aria-busy="true" aria-label="Generazione Esercizi">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-3 w-full max-w-xs">
        <Skeleton className="h-6 w-3/4 rounded-button mx-auto" />
        <Skeleton className="h-4 w-full rounded-full opacity-70" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-24 rounded-pill mx-auto" />
      </div>
      <div className="w-full max-w-sm space-y-2 pt-4">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
      </div>
    </div>
  );
}

export function EserciziCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-card p-5 space-y-4 animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16 rounded-pill" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-6 w-full rounded-button" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-11 w-full rounded-button" />
        <Skeleton className="h-11 w-full rounded-button" />
        <Skeleton className="h-11 w-full rounded-button" />
      </div>
    </div>
  );
}

export function LessonPickerSkeleton() {
  return (
    <div className="flex flex-col h-full" aria-busy="true" aria-label="Caricamento Lezioni">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-40 rounded-button" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-full flex items-center gap-3 p-4 rounded-2xl border bg-surface-container">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-3/4 rounded-button" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 px-4 py-3 border-t border-outline-variant/20">
        <Skeleton className="h-12 w-full rounded-button" />
      </div>
    </div>
  );
}
