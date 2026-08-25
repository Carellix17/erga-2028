import { Skeleton } from "@/components/ui/skeleton";

/**
 * CourseCardSkeleton — replica di CourseCard
 * - rounded-card border p-4 sm:p-5 h-auto con background layer
 * - children placeholder + bottone h-10 w-full rounded-pill
 */
export function CourseCardSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-card border border-inverse-on-surface/15 p-4 sm:p-5 bg-card shadow-level-2 animate-pulse" aria-hidden="true">
      <div className="relative z-10 space-y-3">
        <Skeleton className="h-4 w-24 rounded-pill" />
        <Skeleton className="h-6 w-3/4 rounded-button" />
        <Skeleton className="h-3 w-1/2 rounded-full opacity-70" />
        <Skeleton className="mt-3.5 h-10 w-full rounded-pill" />
      </div>
    </div>
  );
}

export function CourseSelectorSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Caricamento Corsi">
      <Skeleton className="h-6 w-32 rounded-button" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
