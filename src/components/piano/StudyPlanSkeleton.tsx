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

      <section className="min-w-0" aria-hidden="true">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-4 animate-pulse rounded-full bg-secondary/20" />
          ))}
        </div>
        <div className="planner-month-grid grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }, (_, index) => (
            <div key={index} className="h-16 min-w-0 animate-pulse rounded-[24px] border border-[#212327] bg-[#191919]" />
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
