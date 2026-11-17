import { BookOpen, CalendarDays, Check, ClipboardCheck, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DailyTimeline — lista verticale del piano del giorno sulla Home.
 *
 * Card avorio, testo nero, pulsante nero a 24px. Le attività completate
 * si spengono (testo attenuato, barrato, spunta).
 */

export interface TimelineTask {
  id: string;
  title: string;
  time?: string | null;
  subject?: string | null;
  isCompleted?: boolean;
  kind?: "study" | "test" | "assignment" | "evaluation";
}

export interface DailyTimelineProps {
  tasks?: TimelineTask[];
  title?: string;
  seeAllLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCtaLabel?: string;
  onTaskClick?: (taskId: string) => void;
  onSeeAll?: () => void;
}

function taskIcon(kind: TimelineTask["kind"]): LucideIcon {
  if (kind === "study") return BookOpen;
  if (kind === "test" || kind === "evaluation") return ClipboardCheck;
  return CalendarDays;
}

const dayCardClass =
  "rounded-[24px] border border-[#212327] bg-[#FFFBF4] text-[#0a0a0a] shadow-none selection:bg-[#0a0a0a] selection:text-[#FFFBF4]";

const dayButtonClass =
  "flex min-h-12 w-full items-center justify-center rounded-[24px] border border-[#0a0a0a] bg-[#0a0a0a] px-4 text-base font-semibold text-[#FFFBF4] transition-colors hover:border-[#1a1c20] hover:bg-[#1a1c20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF4] active:scale-[0.98] motion-reduce:transform-none";

export function DailyTimeline({
  tasks = [],
  title = "Oggi",
  seeAllLabel = "Vedi tutto",
  emptyTitle = "Nessuna attività prevista",
  emptyDescription,
  emptyCtaLabel,
  onTaskClick,
  onSeeAll,
}: DailyTimelineProps) {
  if (tasks.length === 0) {
    return (
      <section className={`${dayCardClass} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{emptyTitle}</h2>
        {emptyDescription && (
          <p className="mt-1 text-base leading-snug text-[#3a3a3a]">{emptyDescription}</p>
        )}
        {emptyCtaLabel && onSeeAll && (
          <button type="button" onClick={onSeeAll} className={`mt-4 ${dayButtonClass}`}>
            {emptyCtaLabel}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className={dayCardClass}>
      <div className="p-5 pb-2 sm:p-6 sm:pb-2">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
      </div>

      <ul className="px-2 sm:px-3">
        {tasks.map((task) => {
          const Icon = taskIcon(task.kind);
          return (
            <li key={task.id} className="border-t border-[#0a0a0a]/10 first:border-t-0">
              <button
                type="button"
                onClick={() => onTaskClick?.(task.id)}
                className="flex min-h-[60px] w-full items-center gap-3 rounded-[24px] px-3 py-2.5 text-left transition-colors hover:bg-[#0a0a0a]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF4]"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-[24px]",
                    task.isCompleted
                      ? "border border-[#0a0a0a]/20 text-[#3a3a3a]"
                      : "bg-[#0a0a0a] text-[#FFFBF4]",
                  )}
                >
                  {task.isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block break-words text-base font-medium leading-snug",
                      task.isCompleted ? "text-[#3a3a3a] line-through" : "text-[#0a0a0a]",
                    )}
                  >
                    {task.title}
                  </span>
                  {(task.subject || task.time) && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-base text-[#3a3a3a]">
                      {task.subject && <span className="break-words">{task.subject}</span>}
                      {task.subject && task.time && (
                        <span aria-hidden="true" className="text-[#3a3a3a]">·</span>
                      )}
                      {task.time && (
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {task.time}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {onSeeAll && (
        <div className="p-5 pt-3 sm:p-6 sm:pt-3">
          <button type="button" onClick={onSeeAll} className={dayButtonClass}>
            {seeAllLabel}
          </button>
        </div>
      )}
    </section>
  );
}

