import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { it } from "date-fns/locale";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { UserRoutine, RoutineKind } from "@/hooks/useUserRoutines";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { resolveSubjectColor, type SubjectColor } from "@/lib/subjectColors";
import {
  getWeekDays, dayKey, timeToMinutes, isoToDayMinutes, routineSegmentsForDay,
  positionDayEvents, blockTop, blockHeight,
  WEEK_HOUR_START, WEEK_HOUR_END, WEEK_GRID_HEIGHT, WEEK_ROW_H,
} from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";

// Sfondi tenui per i blocchi di routine: sono contesto, NON eventi
const ROUTINE_STYLES: Record<RoutineKind, string> = {
  school: "bg-blue-100/60 border-blue-200 text-blue-900",
  sleep: "bg-indigo-100/60 border-indigo-200 text-indigo-900",
  meal: "bg-amber-100/60 border-amber-200 text-amber-900",
  other: "bg-slate-100/80 border-slate-200 text-slate-800",
};
const ROUTINE_LABELS: Record<RoutineKind, string> = {
  school: "Scuola", sleep: "Sonno", meal: "Pasti", other: "Altro",
};

interface WeekPlannerProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: StudyEvent[];
  evaluations: Evaluation[];
  routines: UserRoutine[];
  subjects: UserSubject[];
}

const DAY_LETTERS = ["L", "M", "M", "G", "V", "S", "D"];
const HOURS = Array.from(
  { length: WEEK_HOUR_END - WEEK_HOUR_START },
  (_, i) => WEEK_HOUR_START + i,
);

export function WeekPlanner({
  selectedDate, onSelectDate, events, evaluations, routines, subjects,
}: WeekPlannerProps) {
  // Su mobile si vede un giorno alla volta (scelto con i pallini in alto)
  const dayIdxOf = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1);
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => dayIdxOf(selectedDate));

  // Se il giorno selezionato cambia da fuori (es. cliccando un evento), segui il cambio
  useEffect(() => {
    setMobileDayIdx(dayIdxOf(selectedDate));
  }, [selectedDate]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  // Mappa nome materia (minuscolo) -> scelta colore utente
  const colorByName = useMemo(() => {
    const m = new Map<string, UserSubject>();
    for (const s of subjects) m.set(s.name.toLowerCase(), s);
    return m;
  }, [subjects]);

  const colorForSubject = (name?: string): SubjectColor | undefined => {
    if (!name) return undefined;
    const custom = colorByName.get(name.toLowerCase());
    return resolveSubjectColor(name, custom?.color);
  };

  const subjectNameById = useMemo(() => {
    const m = new Map(subjects.map((s) => [s.id, s.name] as const));
    return m;
  }, [subjects]);

  /** Le righe (eventi + scadenze) di un certo giorno, pronte per il posizionamento. */
  const rowsForDay = (day: Date) => {
    const key = dayKey(day);
    const rows: { id: string; title: string; subjectName?: string; minutes: number | null; kind: "study" | "test" | "assignment" | "evaluation" }[] = [];
    for (const ev of events) {
      if (dayKey(ev.event_date) === key) {
        rows.push({
          id: ev.id, title: ev.title, subjectName: ev.subject,
          minutes: timeToMinutes(ev.event_time ?? null), kind: ev.event_type,
        });
      }
    }
    for (const ev of evaluations) {
      if (dayKey(new Date(ev.date)) === key) {
        rows.push({
          id: ev.id, title: ev.title,
          subjectName: ev.subject_id ? subjectNameById.get(ev.subject_id) : undefined,
          minutes: isoToDayMinutes(ev.date), kind: "evaluation",
        });
      }
    }
    return rows;
  };

  /** I blocchi routine di un giorno della settimana (1 = lun ... 7 = dom). */
  const routineBlocks = (dayN: number) =>
    routines.flatMap((r) =>
      routineSegmentsForDay(r.days_of_week, r.start_time, r.end_time, dayN).map((seg, i) => ({
        key: `${r.id}-${dayN}-${i}`,
        kind: r.kind,
        label: r.label || ROUTINE_LABELS[r.kind],
        top: blockTop(seg.start),
        height: blockHeight(seg.end - seg.start),
      })),
    );

  const renderDayColumn = (day: Date, dayN: number) => {
    const { timed, untimed } = positionDayEvents(rowsForDay(day));
    return (
      <div key={dayKey(day)} className="relative flex-1 min-w-[92px] border-l border-slate-100 first:border-l-0">
        {/* Striscia "senza orario" */}
        {untimed.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/60 px-1 py-1 space-y-1">
            {untimed.map((u) => {
              const col = u.kind === "evaluation" ? undefined : colorForSubject(u.subjectName);
              return (
                <div
                  key={u.id}
                  title={u.title}
                  className={cn(
                    "text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate border",
                    u.kind === "evaluation"
                      ? "bg-slate-800 text-white border-slate-800"
                      : cn(col?.bg ?? "bg-slate-100", col?.text ?? "text-slate-800", col?.border ?? "border-slate-200"),
                  )}
                >
                  {u.title}
                </div>
              );
            })}
          </div>
        )}

        {/* Griglia oraria della colonna */}
        <div className="relative" style={{ height: WEEK_GRID_HEIGHT }}>
          {/* linee orarie */}
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-slate-100/80"
              style={{ top: i * WEEK_ROW_H }}
            />
          ))}

          {/* blocchi routine (sfondo, non eventi) */}
          {routineBlocks(dayN).map((b) => (
            <div
              key={b.key}
              className={cn("absolute left-0.5 right-0.5 rounded-md border text-[9px] px-1 py-0.5 overflow-hidden", ROUTINE_STYLES[b.kind])}
              style={{ top: b.top + 1, height: b.height - 2 }}
              title={`${b.label} (routine)`}
            >
              <span className="font-medium opacity-70">{b.label}</span>
            </div>
          ))}

          {/* eventi con orario */}
          {timed.map((t) => {
            const col = t.kind === "evaluation" ? undefined : colorForSubject(t.subjectName);
            return (
              <div
                key={t.id}
                className={cn(
                  "absolute left-1 right-1 rounded-lg border px-1.5 py-1 overflow-hidden shadow-sm",
                  t.kind === "evaluation"
                    ? "bg-slate-800 text-white border-slate-800"
                    : cn(col?.bg ?? "bg-slate-100", col?.text ?? "text-slate-800", col?.border ?? "border-slate-200"),
                )}
                style={{ top: t.top + 1, height: t.height - 2 }}
                title={t.subjectName ? `${t.subjectName}: ${t.title}` : t.title}
              >
                <p className="text-[10px] font-semibold leading-tight line-clamp-2">{t.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const mobileDay = weekDays[mobileDayIdx] ?? weekDays[0];

  return (
    <div>
      {/* Intestazioni giorni (click = daily planning di quel giorno) */}
      <div className="hidden md:flex">
        <div className="w-10 shrink-0" />
        {weekDays.map((day, i) => (
          <DayHeader
            key={dayKey(day)}
            day={day}
            letter={DAY_LETTERS[i]}
            selected={isSameDay(day, selectedDate)}
            onClick={() => onSelectDate(day)}
          />
        ))}
      </div>

      {/* Mobile: pallini dei giorni */}
      <div className="md:hidden flex items-center justify-between gap-1 pb-2">
        {weekDays.map((day, i) => {
          const active = i === mobileDayIdx;
          return (
            <button
              key={dayKey(day)}
              onClick={() => { setMobileDayIdx(i); onSelectDate(day); }}
              aria-pressed={active}
              className={cn(
                "flex-1 h-10 rounded-full text-xs font-semibold transition-all flex flex-col items-center justify-center",
                active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-slate-50",
                isToday(day) && !active && "text-primary",
              )}
            >
              <span>{DAY_LETTERS[i]}</span>
              <span className="text-[10px] opacity-80">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: 7 colonne | Mobile: solo il giorno scelto */}
      <div className="overflow-y-auto max-h-[56vh] rounded-xl border border-slate-100 bg-white/60">
        <div className="hidden md:flex">
          {/* Colonna delle ore */}
          <div className="w-10 shrink-0 relative" style={{ height: WEEK_GRID_HEIGHT }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 pr-1 text-right text-[10px] text-muted-foreground tabular-nums"
                style={{ top: i * WEEK_ROW_H - 5 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {weekDays.map((day, i) => renderDayColumn(day, i + 1))}
        </div>
        <div className="md:hidden flex">
          <div className="w-10 shrink-0 relative" style={{ height: WEEK_GRID_HEIGHT }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 pr-1 text-right text-[10px] text-muted-foreground tabular-nums"
                style={{ top: i * WEEK_ROW_H - 5 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {renderDayColumn(mobileDay, mobileDayIdx + 1)}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        I blocchi di sfondo (scuola, sonno, pasti) sono la tua routine, non eventi. Tocca un giorno per i dettagli.
      </p>
    </div>
  );
}

function DayHeader({ day, letter, selected, onClick }: { day: Date; letter: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="flex-1 min-w-[92px] py-2 flex flex-col items-center gap-0.5 rounded-t-xl transition-colors hover:bg-slate-50"
    >
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{letter}</span>
      <span
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-full text-sm",
          selected && "bg-foreground text-background shadow-sm",
          !selected && isToday(day) && "text-primary font-bold",
        )}
      >
        {format(day, "d", { locale: it })}
      </span>
    </button>
  );
}
