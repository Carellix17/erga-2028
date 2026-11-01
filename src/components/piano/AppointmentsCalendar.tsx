import { useId, useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck,
  Hammer, Loader2, Mic, Pencil, PencilLine, Plus, Sparkles, Trash2,
} from "lucide-react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday,
  isValid, parseISO, startOfMonth, startOfWeek, startOfToday,
} from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { dayKey } from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarEntry {
  id: string;
  date: Date;
  time?: string;
  title: string;
  subject: string | null;
  typeLabel: string;
  TypeIcon: typeof Mic;
  original: { kind: "evaluation"; data: Evaluation } | { kind: "studyEvent"; data: StudyEvent };
}

const EVAL_ICONS: Record<EvaluationType, typeof Mic> = {
  orale: Mic, interrogazione: Mic, scritta: PencilLine, compito: BookOpen, pratica: Hammer,
};
const byTime = (a: CalendarEntry, b: CalendarEntry) =>
  (a.time ?? "zz:zz").localeCompare(b.time ?? "zz:zz") || a.title.localeCompare(b.title);

interface AppointmentsCalendarProps {
  evaluations: Evaluation[];
  events: StudyEvent[];
  subjects: UserSubject[];
  exitingIds: string[];
  onAddEvent: () => void;
  showGeneratePlan: boolean;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  onEditEvaluation: (evaluation: Evaluation) => void;
  onEditStudyEvent: (event: StudyEvent) => void;
  onDeleteEvaluation: (evaluation: Evaluation) => void;
  onDeleteStudyEvent: (event: StudyEvent) => void;
}

/** Agenda first; the month is an explicit date selector, never a hover-driven reorder. */
export function AppointmentsCalendar({
  evaluations, events, subjects, exitingIds, onAddEvent, showGeneratePlan,
  onGeneratePlan, isGeneratingPlan, onEditEvaluation, onEditStudyEvent,
  onDeleteEvaluation, onDeleteStudyEvent,
}: AppointmentsCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const calendarId = useId();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const entries = useMemo<CalendarEntry[]>(() => [
    ...evaluations.map((ev): CalendarEntry => ({
      id: ev.id, date: parseISO(ev.date), title: ev.title,
      subject: ev.subject_id ? subjectById.get(ev.subject_id)?.name ?? null : null,
      typeLabel: t(`piano.sheet.evalType_${ev.type}`), TypeIcon: EVAL_ICONS[ev.type] ?? ClipboardCheck,
      original: { kind: "evaluation", data: ev },
    })),
    ...events.map((ev): CalendarEntry => ({
      id: ev.id, date: parseISO(ev.event_date), time: ev.event_time?.slice(0, 5), title: ev.title,
      subject: ev.subject && ev.subject !== "Altro" ? ev.subject : null,
      typeLabel: t(`piano.type_${ev.event_type}`),
      TypeIcon: ev.event_type === "study" ? BookOpen : ClipboardCheck,
      original: { kind: "studyEvent", data: ev },
    })),
  ].filter((entry) => isValid(entry.date)), [evaluations, events, subjectById, t]);

  const entriesByKey = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = dayKey(entry.date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    for (const list of map.values()) list.sort(byTime);
    return map;
  }, [entries]);

  const groups = useMemo(() => [...entriesByKey.entries()]
    .filter(([key, list]) => selectedKey ? key === selectedKey : list[0].date >= startOfToday())
    .sort(([a], [b]) => a.localeCompare(b)), [entriesByKey, selectedKey]);
  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const weekDays = days.slice(0, 7).map((date) => format(date, "EEEEE", { locale }));
  const todayKey = dayKey(new Date());

  const editEntry = (entry: CalendarEntry) => entry.original.kind === "evaluation"
    ? onEditEvaluation(entry.original.data) : onEditStudyEvent(entry.original.data);
  const deleteEntry = (entry: CalendarEntry) => entry.original.kind === "evaluation"
    ? onDeleteEvaluation(entry.original.data) : onDeleteStudyEvent(entry.original.data);

  return (
    <div className="min-w-0 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">{t("piano.workspaceTitle")}</h2>
          <p className="mt-2 max-w-prose text-base text-muted-foreground">{t("piano.workspaceSubtitle")}</p>
        </div>
        <Button onClick={onAddEvent} data-haptic="medium" className="shrink-0">
          <Plus aria-hidden="true" />{t("piano.addEventFull")}
        </Button>
      </div>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0" aria-label={t("piano.upcoming")}>
          <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="text-lg font-semibold">
              {selectedKey ? format(parseISO(selectedKey), "EEEE d MMMM", { locale }) : t("piano.upcoming")}
            </h3>
            <div className="flex items-center gap-1">
              <Button variant={selectedKey === todayKey ? "secondary" : "ghost"} size="sm" aria-pressed={selectedKey === todayKey}
                onClick={() => { setSelectedKey(todayKey); setMonth(startOfMonth(new Date())); }}>{t("piano.today")}</Button>
              <Button variant={selectedKey === null ? "secondary" : "ghost"} size="sm" aria-pressed={selectedKey === null}
                onClick={() => setSelectedKey(null)}>{t("piano.allUpcoming")}</Button>
            </div>
          </div>
          <div key={selectedKey ?? "upcoming"} className="plan-agenda-enter" aria-live="polite" aria-atomic="false">
            {groups.length === 0 ? (
              <div className="border border-border bg-sheet px-5 py-8">
                <CalendarDays className="mb-4 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-lg font-semibold">{t(selectedKey ? "piano.emptyDay" : "piano.noEvents")}</p>
                <p className="mt-2 max-w-prose text-base text-muted-foreground">{t("piano.noEventsHint")}</p>
                <Button variant="outline" onClick={onAddEvent} className="mt-5"><Plus aria-hidden="true" />{t("piano.addEventFull")}</Button>
              </div>
            ) : groups.map(([key, dayEntries]) => (
              <section key={key} className="mb-6 last:mb-0" aria-label={format(dayEntries[0].date, "EEEE d MMMM", { locale })}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  {key === todayKey && <span className="bg-secondary px-2 py-1 text-foreground">{t("piano.today")}</span>}
                  <time dateTime={key}>{format(dayEntries[0].date, "EEEE d MMMM", { locale })}</time>
                </div>
                <ul className="divide-y divide-border border-y border-border">
                  {dayEntries.map((entry) => (
                    <li key={`${entry.original.kind}-${entry.id}`} className={cn(
                      "flex min-w-0 items-start gap-3 py-4 transition-opacity duration-150",
                      exitingIds.includes(entry.id) && "pointer-events-none opacity-0",
                    )}>
                      <div className="grid h-11 w-11 shrink-0 place-items-center bg-secondary text-cognitive"><entry.TypeIcon className="h-5 w-5" aria-hidden="true" /></div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("break-words text-base font-semibold leading-snug text-foreground", entry.original.kind === "evaluation" && entry.original.data.is_completed && "line-through text-muted-foreground")}>{entry.title}</p>
                        {entry.original.kind === "evaluation" && entry.original.data.is_completed && <span className="text-sm text-muted-foreground">{t("piano.completed")}</span>}
                        <p className="mt-1 break-words text-sm text-muted-foreground">{[entry.subject, entry.typeLabel].filter(Boolean).join(" · ")}</p>
                        {entry.time && <time className="mt-2 block font-mono text-sm tabular-nums text-foreground">{entry.time}</time>}
                      </div>
                      <div className="flex shrink-0 flex-col sm:flex-row">
                        <Button variant="ghost" size="icon" aria-label={t("piano.editEntry", { title: entry.title })} onClick={() => editEntry(entry)}><Pencil aria-hidden="true" /></Button>
                        <Button variant="ghost" size="icon" aria-label={t("piano.deleteEntry", { title: entry.title })} onClick={() => deleteEntry(entry)} data-haptic="warning" className="text-muted-foreground hover:text-destructive"><Trash2 aria-hidden="true" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <aside className="min-w-0 space-y-6">
          <section className="border border-border bg-sheet">
            <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring xl:hidden"
              aria-expanded={calendarOpen} aria-controls={calendarId} onClick={() => setCalendarOpen((open) => !open)}>
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{t("piano.calendar")}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", calendarOpen && "rotate-180")} aria-hidden="true" />
            </button>
            <div id={calendarId} className={cn("p-3 sm:p-4", !calendarOpen && "hidden xl:block")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold capitalize" aria-live="polite">{format(month, "MMMM yyyy", { locale })}</h3>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={t("piano.previousMonth")} onClick={() => setMonth((value) => addMonths(value, -1))}><ChevronLeft aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" aria-label={t("piano.nextMonth")} onClick={() => setMonth((value) => addMonths(value, 1))}><ChevronRight aria-hidden="true" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-7" aria-hidden="true">{weekDays.map((day, index) => <span key={index} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</span>)}</div>
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((date) => {
                  const key = dayKey(date);
                  const count = entriesByKey.get(key)?.length ?? 0;
                  return <button key={key} type="button" aria-pressed={selectedKey === key} aria-current={isToday(date) ? "date" : undefined}
                    aria-label={`${format(date, "EEEE d MMMM yyyy", { locale })}, ${t("piano.eventCount", { count })}`}
                    onClick={() => setSelectedKey((current) => current === key ? null : key)}
                    className={cn("relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-button text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selectedKey === key ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-secondary",
                      !isSameMonth(date, month) && selectedKey !== key && "text-muted-foreground",
                      isToday(date) && selectedKey !== key && "bg-secondary font-semibold underline underline-offset-4")}>{format(date, "d")}
                    <span className={cn("h-1 w-1 rounded-full bg-current", !count && "invisible")} aria-hidden="true" />
                  </button>;
                })}
              </div>
            </div>
          </section>
          <section className="border-t border-border pt-5">
            <h3 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-cognitive" aria-hidden="true" />{t("piano.generate")}</h3>
            <p className="mb-4 mt-2 text-sm leading-relaxed text-muted-foreground">{t("piano.generateHint")}</p>
            <Button variant="outline" className="w-full whitespace-normal" onClick={onGeneratePlan} disabled={!showGeneratePlan || isGeneratingPlan} data-haptic="medium">
              {isGeneratingPlan && <Loader2 className="animate-spin" aria-hidden="true" />}{t(isGeneratingPlan ? "piano.generating" : "piano.generate")}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
