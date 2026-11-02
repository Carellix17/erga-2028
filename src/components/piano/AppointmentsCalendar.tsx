import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Upload } from "lucide-react";
import {
  addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameMonth, isToday, isValid, parseISO, startOfMonth, startOfWeek, startOfToday,
} from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { useUserRoutines, type UserRoutine } from "@/hooks/useUserRoutines";
import { dayKey } from "@/lib/weekPlanner";
import { comparePlannerEntries, plannerEntries } from "@/lib/plannerEntries";
import { courseCoverVars } from "@/lib/courseIdentity";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { DayTimeline } from "./DayTimeline";

interface AppointmentsCalendarProps {
  evaluations: Evaluation[];
  events: StudyEvent[];
  subjects: UserSubject[];
  courses?: { id: string; file_name: string }[];
  exitingIds: string[];
  onAddEvent: (date?: string) => void;
  showGeneratePlan: boolean;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  onEditEvaluation: (evaluation: Evaluation) => void;
  onEditStudyEvent: (event: StudyEvent) => void;
  onDeleteEvaluation: (evaluation: Evaluation) => void;
  onDeleteStudyEvent: (event: StudyEvent) => void;
}

/** The month is the entry point. A date URL opens its complete daily schedule. */
const EMPTY_ROUTINES: UserRoutine[] = [];
const capitalizeFirstLetter = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

export function AppointmentsCalendar({
  evaluations, events, subjects, courses, exitingIds, onAddEvent, showGeneratePlan,
  onGeneratePlan, isGeneratingPlan, onEditEvaluation, onEditStudyEvent,
  onDeleteEvaluation, onDeleteStudyEvent,
}: AppointmentsCalendarProps) {
  const { t, i18n } = useTranslation();
  const { data: routineData, isLoading: routinesLoading } = useUserRoutines();
  const routines = routineData ?? EMPTY_ROUTINES;
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const [params, setParams] = useSearchParams();
  const rawDay = params.get("planDay");
  const selectedKey = rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) && isValid(parseISO(rawDay)) ? rawDay : null;
  const [month, setMonth] = useState(() => startOfMonth(selectedKey ? parseISO(selectedKey) : new Date()));
  const [direction, setDirection] = useState(1);
  const [viewChanged, setViewChanged] = useState(false);
  const [monthChanged, setMonthChanged] = useState(false);
  const [keyboardMotion, setKeyboardMotion] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<string | null>(null);
  const overviewScroll = useRef(0);
  const scrollOwnerRef = useRef<HTMLElement | null>(null);
  const previousDay = useRef(selectedKey);
  const deadlinesRef = useRef<HTMLUListElement>(null);
  const [deadlineEdges, setDeadlineEdges] = useState({ start: true, end: true });
  const entries = useMemo(() => plannerEntries(evaluations, events, subjects, courses), [evaluations, events, subjects, courses]);
  const entriesByKey = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = dayKey(entry.date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    for (const list of map.values()) list.sort(comparePlannerEntries);
    return map;
  }, [entries]);
  const deadlines = useMemo(() => entries.filter((entry) => entry.important && !entry.completed && entry.date >= startOfToday())
    .sort((a, b) => a.date.getTime() - b.date.getTime() || comparePlannerEntries(a, b)), [entries]);

  useEffect(() => {
    if (previousDay.current === selectedKey) return;
    if (selectedKey) {
      headingRef.current?.focus({ preventScroll: true });
      screenRef.current?.scrollIntoView?.({ block: "start" });
    } else {
      [...screenRef.current?.querySelectorAll<HTMLButtonElement>("[data-plan-opener]") ?? []].find((button) => button.dataset.planOpener === openerRef.current)?.focus({ preventScroll: true });
      if (scrollOwnerRef.current) scrollOwnerRef.current.scrollTop = overviewScroll.current;
      else window.scrollTo({ top: overviewScroll.current, behavior: "instant" });
    }
    previousDay.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    const list = deadlinesRef.current;
    if (!list) return;
    const update = () => setDeadlineEdges({ start: list.scrollLeft < 2, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); list.removeEventListener("scroll", update); };
  }, [deadlines.length, selectedKey]);

  const openDay = (key: string) => {
    setViewChanged(true);
    if (!selectedKey) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.planOpener ?? null : null;
      const owner = screenRef.current?.closest<HTMLElement>("#app-scroll-view");
      scrollOwnerRef.current = owner && getComputedStyle(owner).overflowY === "auto" ? owner : null;
      overviewScroll.current = scrollOwnerRef.current?.scrollTop ?? window.scrollY;
    }
    setDirection(!selectedKey || key >= selectedKey ? 1 : -1);
    setParams((current) => { const next = new URLSearchParams(current); next.set("planDay", key); return next; });
  };
  const closeDay = () => {
    if (selectedKey) setMonth(startOfMonth(parseISO(selectedKey)));
    setViewChanged(true);
    setDirection(-1);
    setParams((current) => { const next = new URLSearchParams(current); next.delete("planDay"); return next; }, { replace: true });
  };
  const scrollDeadlines = (sign: number) => deadlinesRef.current?.scrollBy({ left: sign * deadlinesRef.current.clientWidth, behavior: "auto" });
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });

  return (
    <div ref={screenRef} className={cn("planner-workspace min-w-0 scroll-mt-20 py-5", keyboardMotion && "planner-no-motion")} onClickCapture={(event) => setKeyboardMotion(event.detail === 0)}>
      <div key={selectedKey ?? "month"} className={cn(viewChanged && "planner-view-enter", direction < 0 && "planner-motion-back")}>
        {selectedKey ? (
          <>
            <Button variant="ghost" onClick={closeDay} className="mb-3 -ml-4"><ArrowLeft aria-hidden="true" />{t("piano.backToCalendar")}</Button>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="planner-calendar-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{capitalizeFirstLetter(format(parseISO(selectedKey), "EEEE d MMMM", { locale }))}</h2>
                <p className="mt-1 text-base text-muted-foreground">{t("piano.dailySubtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => openDay(dayKey(new Date()))}>{t("piano.today")}</Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.previousDay")} onClick={() => openDay(dayKey(addDays(parseISO(selectedKey), -1)))}><ChevronLeft aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.nextDay")} onClick={() => openDay(dayKey(addDays(parseISO(selectedKey), 1)))}><ChevronRight aria-hidden="true" /></Button>
                <Button onClick={() => onAddEvent(selectedKey)} data-haptic="medium"><Plus aria-hidden="true" />{t("piano.addEventFull")}</Button>
              </div>
            </div>
            <DayTimeline dateKey={selectedKey} entries={entriesByKey.get(selectedKey) ?? []} exitingIds={exitingIds}
              routines={routines} routinesLoading={routinesLoading}
              onEdit={(entry) => entry.original.kind === "evaluation" ? onEditEvaluation(entry.original.data) : onEditStudyEvent(entry.original.data)}
              onDelete={(entry) => entry.original.kind === "evaluation" ? onDeleteEvaluation(entry.original.data) : onDeleteStudyEvent(entry.original.data)} />
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="planner-calendar-heading" className="text-3xl font-semibold tracking-tight">{t("piano.workspaceTitle")}</h2>
              <Button variant="outline" onClick={() => openDay(dayKey(new Date()))} data-plan-opener="daily" data-haptic="medium"><CalendarDays aria-hidden="true" />{t("piano.dailySession")}<ArrowUpRight aria-hidden="true" /></Button>
            </div>

            <section className="mb-5 min-w-0" aria-labelledby="planner-deadlines-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="planner-deadlines-heading" className="text-base font-semibold">{t("piano.importantDeadlines")}</h3>
                {deadlines.length > 0 && <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={t("piano.previousDeadlines")} aria-controls="planner-deadlines" disabled={deadlineEdges.start} onClick={() => scrollDeadlines(-1)}><ChevronLeft aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" aria-label={t("piano.nextDeadlines")} aria-controls="planner-deadlines" disabled={deadlineEdges.end} onClick={() => scrollDeadlines(1)}><ChevronRight aria-hidden="true" /></Button>
                </div>}
              </div>
              {deadlines.length === 0 ? <div className="planner-empty-plan border border-border bg-sheet p-4">
                <p className="text-base font-medium">{t("piano.noDeadlinesPlan")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => onAddEvent()} data-haptic="medium"><Plus aria-hidden="true" />{t("piano.addEvaluationEmpty")}</Button>
                  <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("erga:goto-tab", { detail: "studio" }))} data-haptic="medium"><Upload aria-hidden="true" />{t("piano.uploadMaterialEmpty")}</Button>
                </div>
              </div> : (
                <ul ref={deadlinesRef} id="planner-deadlines" className="planner-deadlines">
                  {deadlines.map((entry) => {
                    const remaining = differenceInCalendarDays(entry.date, startOfToday());
                    const label = remaining === 0 ? t("piano.today") : t("piano.daysRemaining", { count: remaining });
                    return <li key={`${entry.original.kind}-${entry.id}`} className="min-w-0">
                      <button type="button" className="planner-deadline" lang={i18n.language} style={courseCoverVars(entry.coverName, entry.customColor).style}
                        onClick={() => openDay(dayKey(entry.date))} data-plan-opener={`deadline-${entry.original.kind}-${entry.id}`} data-haptic="medium"
                        aria-label={`${entry.title}, ${label}, ${format(entry.date, "d MMMM", { locale })}`}>
                        <CourseCardBackground courseName={entry.coverName} customKey={entry.customColor} />
                        <span className="relative z-10 flex h-full min-w-0 flex-col text-contrast">
                          <span className="planner-countdown">{remaining === 0 ? t("piano.today") : remaining}</span>
                          <span className="mb-4 text-sm">{remaining === 0 ? t("piano.inCalendar") : t("piano.remainingUnit", { count: remaining })}</span>
                          <span className="mb-1 break-words text-sm">{entry.subject ?? t("piano.evaluation")}</span>
                          <span className="planner-deadline-title">{entry.title}</span>
                          <time dateTime={dayKey(entry.date)} className="mt-auto pt-3 text-sm">{format(entry.date, "d MMM", { locale })}</time>
                        </span>
                      </button>
                    </li>;
                  })}
                </ul>
              )}
            </section>

            <section className="border border-border bg-sheet" aria-label={t("piano.calendar")}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-5">
                <h3 className="text-xl font-semibold" aria-live="polite">{capitalizeFirstLetter(format(month, "MMMM yyyy", { locale }))}</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setMonthChanged(true); setDirection(new Date() >= month ? 1 : -1); setMonth(startOfMonth(new Date())); }}>{t("piano.today")}</Button>
                  <Button variant="ghost" size="icon" aria-label={t("piano.previousMonth")} onClick={() => { setMonthChanged(true); setDirection(-1); setMonth((value) => addMonths(value, -1)); }}><ChevronLeft aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" aria-label={t("piano.nextMonth")} onClick={() => { setMonthChanged(true); setDirection(1); setMonth((value) => addMonths(value, 1)); }}><ChevronRight aria-hidden="true" /></Button>
                </div>
              </div>
              <div key={format(month, "yyyy-MM")} className={cn(monthChanged && "planner-month-enter", direction < 0 && "planner-motion-back")}>
                <div className="grid grid-cols-7 border-b border-border" aria-hidden="true">
                  {days.slice(0, 7).map((date) => (
                    <span key={dayKey(date)} className="py-2 text-center text-sm font-medium text-muted-foreground">
                      <span className="sm:hidden">{format(date, "EEEEE", { locale })}</span>
                      <span className="hidden sm:inline">{format(date, "EEE", { locale })}</span>
                    </span>
                  ))}
                </div>
                <div className="planner-month-grid">
                  {days.map((date) => {
                    const key = dayKey(date);
                    const dayEntries = entriesByKey.get(key) ?? [];
                    return <button key={key} type="button" aria-current={isToday(date) ? "date" : undefined}
                      aria-label={`${format(date, "EEEE d MMMM yyyy", { locale })}, ${t("piano.eventCount", { count: dayEntries.length })}`}
                      onClick={() => openDay(key)} data-plan-opener={`day-${key}`} data-haptic="medium" className={cn("planner-day", !isSameMonth(date, month) && "planner-day-outside", isToday(date) && "planner-day-today")}>
                      <span className="planner-day-number">{format(date, "d")}</span>
                      {dayEntries.length > 0 && <>
                        <span className="planner-day-count" aria-hidden="true">{dayEntries.length}<span className="planner-day-dot" /></span>
                        <span className="planner-day-titles" aria-hidden="true">{dayEntries.slice(0, 2).map((entry) => <span key={`${entry.original.kind}-${entry.id}`} className={cn("truncate", entry.completed && "line-through")}>{entry.time && `${entry.time} `}{entry.title}</span>)}{dayEntries.length > 2 && <span>+{dayEntries.length - 2}</span>}</span>
                      </>}
                    </button>;
                  })}
                </div>
              </div>
            </section>

            <div className="planner-actions mt-3 grid gap-2 sm:grid-cols-2">
              <Button onClick={() => onAddEvent()} data-haptic="medium" className="h-auto min-h-12 whitespace-normal"><Plus aria-hidden="true" />{t("piano.addEventFull")}</Button>
              <Button variant="outline" className="planner-generate h-auto min-h-12 whitespace-normal" onClick={onGeneratePlan} disabled={!showGeneratePlan || isGeneratingPlan} data-haptic="medium" aria-describedby="planner-generate-hint">
                {isGeneratingPlan ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}{t(isGeneratingPlan ? "piano.generating" : "piano.generate")}
              </Button>
            </div>
            <p id="planner-generate-hint" className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t(showGeneratePlan ? "piano.generateHint" : "piano.generateUnavailable")}</p>
          </>
        )}
      </div>
    </div>
  );
}
