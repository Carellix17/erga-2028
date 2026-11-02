import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { plannerDateKey, plannerDateTimeParts } from "@/lib/planner/freeTime";

interface NowLineProps {
  dateKey: string;
  startMinute: number;
  endMinute: number;
  pixelsPerHour: number;
  /** Injected clock for deterministic rendering/tests. Production refreshes once per minute. */
  now?: Date;
}

function clockParts(value: Date) {
  const parts = plannerDateTimeParts(value);
  if (!parts) return null;
  return { day: plannerDateKey(value), minute: parts.hour * 60 + parts.minute, hour: parts.hour, minutePart: parts.minute };
}

export function NowLine({ dateKey, startMinute, endMinute, pixelsPerHour, now }: NowLineProps) {
  const { t } = useTranslation();
  const [clock, setClock] = useState(() => now ?? new Date());

  useEffect(() => {
    if (now) {
      setClock(now);
      return;
    }
    const refresh = () => setClock(new Date());
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [now]);

  const current = clockParts(clock);
  if (!current || current.day !== dateKey || current.minute < startMinute || current.minute >= endMinute) return null;

  const time = `${String(current.hour).padStart(2, "0")}:${String(current.minutePart).padStart(2, "0")}`;
  const top = ((current.minute - startMinute) / 60) * pixelsPerHour;
  const label = t("piano.timelineNow", { time });

  return (
    <div
      className="planner-now-line"
      data-testid="now-line"
      role="status"
      aria-label={label}
      style={{ top: `${top}px` }}
    >
      <span className="planner-now-line-rule" aria-hidden="true" />
      <span className="planner-now-line-label" aria-hidden="true">{label}</span>
    </div>
  );
}
