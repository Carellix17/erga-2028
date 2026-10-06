import { BookOpen, CalendarDays, Check, ClipboardCheck, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DailyTimeline — piano del giorno sulla Home (V2-01, DESIGN.md 2.1 §9).
 *
 * Il prossimo impegno vive su CARTA QUIETA: card opaca raggio 24, filetto
 * delicato, righe serene. Le attività completate si spengono (testo
 * attenuato, barrato, spunta in chip quieto); quelle da fare portano
 * l'icona in un chip tondo del contenuto. Un solo controllo «Vedi tutto»,
 * sobrio (raggio control 16), mai un pulsante pieno.
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
      <section className="paper-grain rounded-card border border-border bg-card p-5 shadow-tactile">
        <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
        {emptyDescription && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{emptyDescription}</p>
        )}
        {emptyCtaLabel && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-control border border-border bg-transparent text-[15px] font-medium text-foreground transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="paper-grain overflow-hidden rounded-card border border-border bg-card shadow-tactile">
      <div className="flex items-center justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex h-9 items-center rounded-control px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                className="flex min-h-[60px] w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-[14px]",
                    task.isCompleted
                      ? "bg-surface-container-high text-muted-foreground"
                      : "bg-surface-container-high text-foreground",
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
                      "block truncate text-base font-medium leading-snug",
                      task.isCompleted ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {task.title}
                  </span>
                  {(task.subject || task.time) && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {task.subject && <span className="max-w-[160px] truncate">{task.subject}</span>}
                      {task.subject && task.time && (
                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                      )}
                      {task.time && (
                        <span className="flex items-center gap-1">
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
