import { useEffect, useRef } from "react";
import { BookOpen, ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PlannerEntry } from "@/lib/plannerEntries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DailyScheduleProps {
  dateKey: string;
  entries: PlannerEntry[];
  exitingIds: string[];
  onEdit: (entry: PlannerEntry) => void;
  onDelete: (entry: PlannerEntry) => void;
}

/** Start times are real. Unknown times stay separate; no fictional durations. */
export function DailySchedule({ dateKey, entries, exitingIds, onEdit, onDelete }: DailyScheduleProps) {
  const { t } = useTranslation();
  const timelineRef = useRef<HTMLDivElement>(null);
  const allDay = entries.filter((entry) => !entry.time);
  const timed = entries.filter((entry) => entry.time);
  const initialHour = Number(timed[0]?.time?.slice(0, 2) ?? "08");
  useEffect(() => {
    const timeline = timelineRef.current;
    const target = timeline?.querySelector<HTMLElement>(`[data-hour="${initialHour}"]`);
    if (timeline && target) timeline.scrollTop += target.getBoundingClientRect().top - timeline.getBoundingClientRect().top - timeline.clientTop;
  }, [dateKey, initialHour]);

  const renderEntry = (entry: PlannerEntry) => {
    const typeLabel = entry.original.kind === "evaluation"
      ? t(`piano.sheet.evalType_${entry.original.data.type}`)
      : t(`piano.type_${entry.original.data.event_type}`);
    const Icon = entry.original.kind === "studyEvent" && entry.original.data.event_type === "study" ? BookOpen : ClipboardCheck;
    return <li key={`${entry.original.kind}-${entry.id}`} className={cn("planner-schedule-event", exitingIds.includes(entry.id) && "pointer-events-none opacity-0")}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><Icon className="h-4 w-4" aria-hidden="true" />{entry.time && <time className="font-mono tabular-nums">{entry.time}</time>}<span>{[entry.subject, typeLabel].filter(Boolean).join(" · ")}</span></div>
        <p className={cn("break-words text-base font-semibold", entry.completed && "text-muted-foreground line-through")}>{entry.title}</p>
        {entry.completed && <span className="text-sm text-muted-foreground">{t("piano.completed")}</span>}
      </div>
      <div className="flex shrink-0 flex-col sm:flex-row">
        <Button variant="ghost" size="icon" aria-label={t("piano.editEntry", { title: entry.title })} onClick={() => onEdit(entry)}><Pencil aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" aria-label={t("piano.deleteEntry", { title: entry.title })} onClick={() => onDelete(entry)} data-haptic="warning" className="text-muted-foreground hover:text-destructive"><Trash2 aria-hidden="true" /></Button>
      </div>
    </li>;
  };

  return (
    <div>
      {entries.length === 0 && <p className="mb-4 border border-border bg-sheet p-4 text-base text-muted-foreground">{t("piano.emptyDay")}</p>}
      <section className="mb-4" aria-label={t("piano.withoutTime")}>
        <h3 className="mb-2 text-base font-semibold">{t("piano.withoutTime")}</h3>
        {allDay.length ? <ul className="divide-y divide-border border border-border">{allDay.map(renderEntry)}</ul> : <p className="text-sm text-muted-foreground">{t("piano.noUntimedEvents")}</p>}
      </section>
      <h3 id="planner-timeline-title" className="mb-2 text-base font-semibold">{t("piano.hourByHour")}</h3>
      <div ref={timelineRef} role="region" tabIndex={0} aria-labelledby="planner-timeline-title" className="planner-timeline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div key={dateKey}>
          {Array.from({ length: 24 }, (_, hour) => {
            const hourEntries = timed.filter((entry) => Number(entry.time?.slice(0, 2)) === hour);
            return <div key={hour} data-hour={hour} className="planner-hour">
              <span className="planner-hour-label font-mono tabular-nums">{String(hour).padStart(2, "0")}:00</span>
              <div className="min-w-0">{hourEntries.length > 0 && <ul className="space-y-2 p-2">{hourEntries.map(renderEntry)}</ul>}</div>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
