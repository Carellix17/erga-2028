import { useTranslation } from "react-i18next";

/** Loading layout shaped like the planner's deadline strip and monthly calendar. */
export function StudyPlanSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="planner-workspace min-w-0 scroll-mt-20 py-5"
      role="status"
      aria-busy="true"
      aria-label={t("piano.loading")}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3" aria-hidden="true">
        <div className="h-9 w-56 animate-pulse bg-secondary/30" />
        <div className="h-11 w-40 animate-pulse bg-secondary/30" />
      </div>

      <section className="mb-5 min-w-0" aria-hidden="true">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="h-6 w-48 animate-pulse bg-secondary/30" />
          <div className="flex gap-1">
            <div className="h-11 w-11 animate-pulse bg-secondary/30" />
            <div className="h-11 w-11 animate-pulse bg-secondary/30" />
          </div>
        </div>
        <ul className="planner-deadlines">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="min-w-0 h-44">
              <div className="planner-deadline bg-secondary/30 p-4">
                <div className="mb-3 h-8 w-8 animate-pulse bg-secondary/50" />
                <div className="h-3 w-20 animate-pulse bg-secondary/50" />
                <div className="mt-4 h-4 w-full animate-pulse bg-secondary/50" />
                <div className="mt-2 h-4 w-3/4 animate-pulse bg-secondary/50" />
                <div className="mt-4 h-3 w-16 animate-pulse bg-secondary/50" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-border bg-sheet" aria-hidden="true">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-5">
          <div className="h-7 w-40 animate-pulse bg-secondary/30" />
          <div className="flex items-center gap-1">
            <div className="h-11 w-16 animate-pulse bg-secondary/30" />
            <div className="h-11 w-11 animate-pulse bg-secondary/30" />
            <div className="h-11 w-11 animate-pulse bg-secondary/30" />
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse border-r border-border bg-secondary/20 last:border-r-0" />
          ))}
        </div>
        <div className="planner-month-grid">
          {Array.from({ length: 42 }, (_, index) => (
            <div key={index} className="aspect-square min-w-0 rounded-none border border-border bg-secondary/30 animate-pulse" />
          ))}
        </div>
      </section>

      <div className="planner-actions mt-3 grid gap-2 sm:grid-cols-2" aria-hidden="true">
        <div className="h-12 animate-pulse bg-secondary/30" />
        <div className="h-12 animate-pulse border border-border bg-secondary/30" />
      </div>
      <div className="mt-3 h-4 w-3/4 animate-pulse bg-secondary/30" aria-hidden="true" />
    </div>
  );
}
