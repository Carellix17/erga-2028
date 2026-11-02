import { format, isToday } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { PlannerEntry } from "@/lib/plannerEntries";
import { dayKey, getWeekDays } from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  selectedKey: string;
  selectedDate: Date;
  entriesByKey: ReadonlyMap<string, readonly PlannerEntry[]>;
  onSelectDay: (key: string) => void;
  onOpenSlot: (entry: PlannerEntry) => void;
}

function typeLabel(entry: PlannerEntry, t: ReturnType<typeof useTranslation>["t"]) {
  if (entry.kind === "study") return t("piano.type_study");
  if (entry.kind === "evaluation") return t("piano.type_test");
  if (entry.kind === "personal") return t("piano.timelineBusy");
  return t("piano.type_assignment");
}

export function WeekView({ selectedKey, selectedDate, entriesByKey, onSelectDay, onOpenSlot }: WeekViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const days = getWeekDays(selectedDate);

  return (
    <section className="planner-week-view" aria-label={t("piano.weekViewLabel")}>
      <div className="planner-week-view-grid">
        {days.map((date) => {
          const key = dayKey(date);
          const selected = key === selectedKey;
          const dayEntries = entriesByKey.get(key) ?? [];
          return (
            <article key={key} className={cn("planner-week-column", selected && "planner-week-column--selected")}>
              <h3 className="planner-week-column-heading">
                <button type="button" aria-current={isToday(date) ? "date" : undefined} aria-pressed={selected} onClick={() => onSelectDay(key)}>
                  <span>{format(date, "EEE", { locale })}</span>
                  <span className="planner-week-column-number">{format(date, "d MMM", { locale })}</span>
                </button>
              </h3>
              {dayEntries.length > 0 ? (
                <ul className="planner-week-slots">
                  {dayEntries.map((entry) => {
                    const label = typeLabel(entry, t);
                    const parts = [label, entry.time, entry.subject, entry.title].filter(Boolean);
                    return (
                      <li key={`${entry.original.kind}-${entry.id}`}>
                        <button
                          type="button"
                          className="planner-week-slot"
                          aria-label={t("piano.weekOpenSlot", { slot: parts.join(", ") })}
                          data-slot-id={entry.id}
                          onClick={() => onOpenSlot(entry)}
                        >
                          {entry.time && <time className="planner-week-slot-time font-mono tabular-nums">{entry.time}</time>}
                          <span className="planner-week-slot-type">{label}</span>
                          {entry.subject && <span className="planner-week-slot-subject">{entry.subject}</span>}
                          <span className="planner-week-slot-title">{entry.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="planner-week-empty">{t("piano.noEventsOnDate")}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
