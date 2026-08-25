import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const HOME_BLOCK_CLASS =
  "border border-ink/[0.08] bg-off-white text-[#181516] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)]";

/**
 * HomeDashboardSkeleton — Dashboard principale
 * Replica pixel-perfect di HomeView per zero CLS:
 * - Header: todayLabel h-5 w-28, greeting h-8 w-48, name h-9 w-36, subtitle h-4 w-64
 * - Resume card: h-56 rounded-card con badge, titolo, progress, bottone
 * - Today plan: eyebrow + titolo + lista task min-h-[76px] con icona 44px
 * - Focus timer card: p-5 sm:p-6
 */
export function HomeDashboardSkeleton() {
  return (
    <div className="relative isolate min-w-0 overflow-x-clip py-6 animate-fade-up" aria-busy="true" aria-label="Caricamento Dashboard">
      <div className="relative z-10 space-y-9 md:space-y-12">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <header className="min-w-0 space-y-3">
            <Skeleton className="h-4 w-28 rounded-pill" />
            <div className="space-y-1">
              <Skeleton className="h-8 w-48 rounded-button" />
              <Skeleton className="h-9 w-36 rounded-button" />
            </div>
            <Skeleton className="h-4 w-64 rounded-full opacity-70 hidden md:block" />
          </header>

          {/* Resume Lesson Card — h-auto con stessi padding p-5 sm:p-6 */}
          <section>
            <Card className="relative h-auto overflow-hidden border-inverse-surface bg-inverse-surface">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-24 rounded-pill" />
                  <Skeleton className="h-6 w-32 rounded-pill" />
                </div>
                <Skeleton className="h-8 w-3/4 rounded-button" />
                <Skeleton className="h-7 w-2/3 rounded-button opacity-80" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-5 h-12 w-full sm:w-[220px] rounded-button" />
              </div>
            </Card>
          </section>
        </div>

        {/* Today Plan */}
        <section className="min-w-0 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-pill" />
              <Skeleton className="h-6 w-32 rounded-button" />
            </div>
            <Skeleton className="h-9 w-20 rounded-button" />
          </div>

          {/* Next evaluation pill */}
          <div className={cn(HOME_BLOCK_CLASS, "flex min-h-[84px] w-full items-center gap-3 rounded-lg p-4")}>
            <Skeleton className="h-14 w-16 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24 rounded-pill" />
              <Skeleton className="h-5 w-3/4 rounded-button" />
            </div>
          </div>

          {/* Daily tasks card */}
          <Card className={cn(HOME_BLOCK_CLASS, "overflow-hidden rounded-lg")}>
            <CardContent className="p-2 sm:p-3 space-y-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex min-h-[76px] items-center gap-3 rounded-md px-2 py-3 sm:px-3",
                    i !== 2 && "border-b border-ink/[0.08]"
                  )}
                >
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-button" />
                    <Skeleton className="h-3 w-1/2 rounded-full opacity-70" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Focus Timer */}
        <section className="space-y-4 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20 rounded-pill" />
            <Skeleton className="h-5 w-28 rounded-button" />
          </div>
          <Card className={cn(HOME_BLOCK_CLASS, "rounded-lg p-5 sm:p-6")}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <Skeleton className="h-14 w-16 rounded-md shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40 rounded-button" />
                  <Skeleton className="h-4 w-56 rounded-full opacity-70" />
                  <Skeleton className="h-4 w-48 rounded-full opacity-60" />
                </div>
              </div>
              <div className="flex flex-col gap-3.5 sm:items-end">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-12 w-20 rounded-button" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <Skeleton className="h-12 w-full sm:w-48 rounded-button" />
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
