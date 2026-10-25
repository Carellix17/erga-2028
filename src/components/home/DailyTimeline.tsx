import { BookOpen, CalendarDays, Check, ClipboardCheck, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DailyTimeline — lista verticale del piano del giorno sulla Home.
 *
 * Una superficie carta con bordo di griglia, senza ombre o grana. Le attività
 * completate si spengono (testo attenuato, barrato, spunta); quelle da fare
 * mantengono un target ampio e un'etichetta che può andare a capo.
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
    // Stato senza impegni: breve e utile (2.1 §9), non un pannello vuoto.
    return (
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
        {emptyDescription && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{emptyDescription}</p>
        )}
        {emptyCtaLabel && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-control border border-border bg-secondary text-base font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex min-h-11 items-center rounded-control px-3.5 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {seeAllLabel}
          </button>
        )}
      </div>

      <ul className="px-2 pb-2 sm:px-2.5">
        {tasks.map((task) => {
          const Icon = taskIcon(task.kind);
          return (
            <li key={task.id} className="border-t border-border first:border-t-0">
              <button
                type="button"
                onClick={() => onTaskClick?.(task.id)}
                className="flex min-h-[60px] w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-control",
                    task.isCompleted
                      ? "bg-secondary text-ink-muted"
                      : "bg-secondary text-secondary-foreground",
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
                      task.isCompleted ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {task.title}
                  </span>
                  {(task.subject || task.time) && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                      {task.subject && <span className="break-words">{task.subject}</span>}
                      {task.subject && task.time && (
                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
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
    </section>
  );
}

