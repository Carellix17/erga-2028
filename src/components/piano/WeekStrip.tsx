import { format } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { PlannerEntry } from "@/lib/plannerEntries";
import { validEventTime } from "@/lib/plannerEntries";
import { dayKey, getWeekDays, timeToMinutes } from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";

interface WeekStripProps {
  selectedKey: string;
  selectedDate: Date;
  entriesByKey: ReadonlyMap<string, readonly PlannerEntry[]>;
  onSelectDay: (key: string) => void;
}

function studyLoadMinutes(entries: readonly PlannerEntry[]) {
  return entries.reduce((sum, entry) => {
    if (entry.kind !== "study") return sum;
    const start = timeToMinutes(validEventTime(entry.time));
    const end = timeToMinutes(validEventTime(entry.endTime));
    return start !== null && end !== null && end > start ? sum + end - start : sum;
  }, 0);
}

function formatStudyLoad(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export function WeekStrip({ selectedKey, selectedDate, entriesByKey, onSelectDay }: WeekStripProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const todayKey = dayKey(new Date());
  const days = getWeekDays(selectedDate);

  return (
    <nav className="planner-week-strip" aria-label={t("piano.weekStripLabel")}>
      {days.map((date) => {
        const key = dayKey(date);
        const selected = key === selectedKey;
        const load = formatStudyLoad(studyLoadMinutes(entriesByKey.get(key) ?? []));
        const accessibleDay = format(date, "EEEE d MMMM", { locale });
        return (
          <button
            key={key}
            type="button"
            className={cn("planner-week-strip-day", selected && "planner-week-strip-day--selected")}
            aria-current={key === todayKey ? "date" : undefined}
            aria-pressed={selected}
            aria-label={t("piano.weekStripDay", { day: accessibleDay, load })}
            data-week-day={key}
            onClick={() => onSelectDay(key)}
          >
            <span className="planner-week-strip-weekday" aria-hidden="true">{format(date, "EEE", { locale })}</span>
            <span className="planner-week-strip-number" aria-hidden="true">{format(date, "d")}</span>
            <span className="planner-week-strip-load" aria-hidden="true">{load}</span>
          </button>
        );
      })}
    </nav>
  );
}
