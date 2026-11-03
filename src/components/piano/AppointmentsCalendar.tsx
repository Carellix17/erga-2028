import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, History, Loader2, MoreHorizontal, Plus, Upload } from "lucide-react";
import {
  addDays, addMonths, differenceInCalendarDays, endOfWeek, format, isSameMonth,
  isToday, isValid, parseISO, startOfMonth, startOfToday, startOfWeek,
} from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { useUserRoutines, type UserRoutine } from "@/hooks/useUserRoutines";
import { dayKey, getWeekDays } from "@/lib/weekPlanner";
import { plannerDateKey } from "@/lib/planner/freeTime";
import { comparePlannerEntries, plannerEntries, type PlannerEntry } from "@/lib/plannerEntries";
import { courseCoverVars } from "@/lib/courseIdentity";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PillToggle } from "@/components/ui/pill-toggle";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DayTimeline } from "./DayTimeline";
import { MoveSlotSheet, type MoveSlotRequest } from "./MoveSlotSheet";
import type { MoveSlotSaveTarget, MoveSlotTarget } from "@/lib/planner/conflicts";
import { WeekStrip } from "./WeekStrip";
import { WeekView } from "./WeekView";

interface AppointmentsCalendarProps {
  evaluations: Evaluation[];
  events: StudyEvent[];
  subjects: UserSubject[];
  courses?: { id: string; file_name: string }[];
  exitingIds: string[];
  onAddEvent: (date?: string) => void;
  showGeneratePlan: boolean;
  onPreparePlan: () => void;
  isPreparingPlan: boolean;
  onOpenHistory: () => void;
  onEditEvaluation: (evaluation: Evaluation) => void;
  onEditStudyEvent: (event: StudyEvent) => void;
  onDeleteEvaluation: (evaluation: Evaluation) => void;
  onDeleteStudyEvent: (event: StudyEvent) => void;
  onMoveSlot?: (event: StudyEvent, target: MoveSlotSaveTarget) => Promise<"applied" | "conflict" | "failed">;
  isMoving?: boolean;
  onMoveSheetOpenChange?: (open: boolean) => void;
  onMoveInteractionChange?: (active: boolean) => void;
}

type CalendarView = "day" | "week" | "month";
const CALENDAR_VIEWS: readonly CalendarView[] = ["day", "week", "month"];
const EMPTY_ROUTINES: UserRoutine[] = [];
const capitalizeFirstLetter = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

function isCalendarView(value: string | null): value is CalendarView {
  return value !== null && CALENDAR_VIEWS.includes(value as CalendarView);
}

function isDateKey(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

function dayCounts(entries: readonly PlannerEntry[]) {
  const verifications = entries.filter((entry) => entry.kind === "evaluation").length;
  const study = entries.filter((entry) => entry.kind === "study").length;
  return { verifications, study, commitments: entries.length - verifications - study };
}

export function AppointmentsCalendar({
  evaluations, events, subjects, courses, exitingIds, onAddEvent, showGeneratePlan,
  onPreparePlan, isPreparingPlan, onOpenHistory, onEditEvaluation, onEditStudyEvent,
  onDeleteEvaluation, onDeleteStudyEvent, onMoveSlot, isMoving = false,
  onMoveSheetOpenChange, onMoveInteractionChange,
}: AppointmentsCalendarProps) {
  const { t, i18n } = useTranslation();
  const { data: routineData, isLoading: routinesLoading } = useUserRoutines();
  const routines = routineData ?? EMPTY_ROUTINES;
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const [params, setParams] = useSearchParams();
  const rawView = params.get("view");
  const rawDay = params.get("planDay");
  const view: CalendarView = isCalendarView(rawView) ? rawView : "day";
  const todayKey = dayKey(new Date());
  const selectedKey = isDateKey(rawDay) ? rawDay : todayKey;
  const selectedDate = parseISO(selectedKey);
  const slotId = params.get("slot");
  const [direction, setDirection] = useState(1);
  const [viewChanged, setViewChanged] = useState(false);
  const [monthChanged, setMonthChanged] = useState(false);
  const [keyboardMotion, setKeyboardMotion] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const monthGridRef = useRef<HTMLDivElement>(null);
  const previousView = useRef<CalendarView>(view);
  const previousDayKey = useRef(selectedKey);
  const monthOpenerKey = useRef<string | null>(null);
  const pendingMonthFocus = useRef<string | null>(null);
  const overviewScroll = useRef(0);
  const scrollOwnerRef = useRef<HTMLElement | null>(null);
  const deadlinesRef = useRef<HTMLUListElement>(null);
  const [deadlineEdges, setDeadlineEdges] = useState({ start: true, end: true });
  const entries = useMemo(() => plannerEntries(evaluations, events, subjects, courses), [evaluations, events, subjects, courses]);
  const entriesByKey = useMemo(() => {
    const map = new Map<string, PlannerEntry[]>();
    for (const entry of entries) {
      const key = dayKey(entry.date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    for (const list of map.values()) list.sort(comparePlannerEntries);
    return map;
  }, [entries]);
  const deadlines = useMemo(() => entries.filter((entry) => entry.important && !entry.completed && entry.date >= startOfToday())
    .sort((a, b) => a.date.getTime() - b.date.getTime() || comparePlannerEntries(a, b)), [entries]);
  const selectedSlot = entries.find((entry) => entry.id === slotId) ?? null;
  const [moveRequest, setMoveRequest] = useState<MoveSlotRequest | null>(null);
  const monthStart = startOfMonth(selectedDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
  const monthWeeks = Array.from({ length: 6 }, (_, index) => monthDays.slice(index * 7, index * 7 + 7));
  const weekDays = getWeekDays(selectedDate);

  useEffect(() => {
    if (rawView === view && rawDay === selectedKey) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", view);
      next.set("planDay", selectedKey);
      return next;
    }, { replace: true });
  }, [rawDay, rawView, selectedKey, setParams, view]);

  useEffect(() => {
    const list = deadlinesRef.current;
    if (!list) return;
    const update = () => setDeadlineEdges({ start: list.scrollLeft < 2, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); list.removeEventListener("scroll", update); };
  }, [deadlines.length]);

  useEffect(() => {
    const priorView = previousView.current;
    const dayChanged = previousDayKey.current !== selectedKey;
    if (view === "day" && (priorView !== "day" || dayChanged)) {
      headingRef.current?.focus({ preventScroll: true });
      screenRef.current?.scrollIntoView?.({ block: "start" });
    }
    if (view === "month" && priorView === "day") {
      const focusKey = monthOpenerKey.current ?? selectedKey;
      const focusTarget = monthGridRef.current?.querySelector<HTMLButtonElement>(`button[data-day-key="${focusKey}"]`)
        ?? monthGridRef.current?.querySelector<HTMLButtonElement>(`button[data-day-key="${selectedKey}"]`);
      focusTarget?.focus({ preventScroll: true });
      if (scrollOwnerRef.current) scrollOwnerRef.current.scrollTop = overviewScroll.current;
      else window.scrollTo({ top: overviewScroll.current, behavior: "auto" });
      monthOpenerKey.current = null;
    }
    if (view === "month" && pendingMonthFocus.current) {
      const focusKey = pendingMonthFocus.current;
      monthGridRef.current?.querySelector<HTMLButtonElement>(`button[data-day-key="${focusKey}"]`)?.focus({ preventScroll: true });
      pendingMonthFocus.current = null;
    }
    previousView.current = view;
    previousDayKey.current = selectedKey;
  }, [selectedKey, view]);

  const captureMonthPosition = () => {
    const owner = screenRef.current?.closest<HTMLElement>("#app-scroll-view");
    scrollOwnerRef.current = owner && getComputedStyle(owner).overflowY === "auto" ? owner : null;
    overviewScroll.current = scrollOwnerRef.current?.scrollTop ?? window.scrollY;
  };

  const replaceCalendarState = (nextView: CalendarView, nextDay: string) => {
    setViewChanged(true);
    setDirection(nextDay < selectedKey ? -1 : 1);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", nextView);
      next.set("planDay", nextDay);
      next.delete("slot");
      return next;
    }, { replace: true });
  };

  const changeView = (nextView: CalendarView) => {
    if (nextView === view) return;
    if (view === "month" && nextView === "day") {
      monthOpenerKey.current = selectedKey;
      captureMonthPosition();
    }
    replaceCalendarState(nextView, selectedKey);
  };

  const openDay = (key: string) => {
    if (view === "month") {
      monthOpenerKey.current = key;
      captureMonthPosition();
    }
    replaceCalendarState("day", key);
  };

  const changeDay = (key: string) => replaceCalendarState(view, key);
  const goToday = () => replaceCalendarState(view, todayKey);
  const changeWeek = (offset: number) => replaceCalendarState("week", dayKey(addDays(selectedDate, offset * 7)));
  const changeMonth = (offset: number) => {
    const nextKey = dayKey(addMonths(monthStart, offset));
    pendingMonthFocus.current = nextKey;
    setMonthChanged(true);
    replaceCalendarState("month", nextKey);
  };

  const closeSlot = () => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("slot");
      return next;
    }, { replace: true });
  };
  const openSlot = (entry: PlannerEntry) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", view);
      next.set("planDay", selectedKey);
      next.set("slot", entry.id);
      return next;
    });
  };

  const handleMonthKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let nextDate: Date | null = null;
    switch (event.key) {
      case "ArrowRight": nextDate = addDays(date, 1); break;
      case "ArrowLeft": nextDate = addDays(date, -1); break;
      case "ArrowDown": nextDate = addDays(date, 7); break;
      case "ArrowUp": nextDate = addDays(date, -7); break;
      case "Home": nextDate = startOfWeek(date, { weekStartsOn: 1 }); break;
      case "End": nextDate = endOfWeek(date, { weekStartsOn: 1 }); break;
      case "PageUp": nextDate = addMonths(date, event.shiftKey ? -12 : -1); break;
      case "PageDown": nextDate = addMonths(date, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();
    const nextKey = dayKey(nextDate);
    pendingMonthFocus.current = nextKey;
    replaceCalendarState("month", nextKey);
  };

  const scrollDeadlines = (sign: number) => deadlinesRef.current?.scrollBy({ left: sign * deadlinesRef.current.clientWidth, behavior: "auto" });
  const selectedDayEntries = entriesByKey.get(selectedKey) ?? [];
  const requestMove = (entry: PlannerEntry, target?: MoveSlotTarget) => {
    if (
      !onMoveSlot
      || entry.kind !== "study"
      || entry.completed
      || entry.status === "done"
      || entry.status === "skipped"
      || !entry.time
      || entry.original.kind !== "studyEvent"
      || entry.original.data.event_type !== "study"
      || entry.original.data.is_completed
      || entry.original.data.status === "done"
      || entry.original.data.status === "skipped"
    ) return;
    const event = entry.original.data;
    const moveTarget = target ?? {
      date: plannerDateKey(event.event_date) ?? dayKey(entry.date),
      time: entry.time,
    };
    setMoveRequest({ event, target: moveTarget });
    onMoveSheetOpenChange?.(true);
  };
  const closeMoveSheet = () => {
    setMoveRequest(null);
    onMoveSheetOpenChange?.(false);
  };
  const viewOptions = [
    { value: "day" as const, label: t("piano.day") },
    { value: "week" as const, label: t("piano.week") },
    { value: "month" as const, label: t("piano.month") },
  ];

  return (
    <div ref={screenRef} className={cn("planner-workspace min-w-0 scroll-mt-20 py-5", keyboardMotion && "planner-no-motion")} onClickCapture={(event) => setKeyboardMotion(event.detail === 0)}>
      <header className="planner-calendar-toolbar mb-5">
        <div className="planner-calendar-title">
          {view === "day" ? <h2 className="text-3xl font-semibold tracking-tight">{t("piano.workspaceTitle")}</h2>
            : <h2 id="planner-calendar-heading" className="text-3xl font-semibold tracking-tight">{t("piano.workspaceTitle")}</h2>}
          <p className="mt-1 text-sm text-muted-foreground">{t("piano.workspaceSubtitle")}</p>
        </div>
        <div className="planner-calendar-controls">
          <PillToggle
            options={viewOptions}
            value={view}
            onChange={changeView}
            variant="track"
            size="sm"
            aria-label={t("piano.viewSelector")}
            className="planner-view-toggle"
          />
          <Button onClick={() => onAddEvent(selectedKey)} aria-label={t("piano.addEventFull")} data-haptic="medium" className="h-11 min-w-11 gap-2">
            <Plus aria-hidden="true" /><span>{t("piano.addShort")}</span>
          </Button>
          <Button variant="outline" className="planner-generate h-11 whitespace-normal" onClick={onPreparePlan} disabled={!showGeneratePlan || isPreparingPlan} data-haptic="medium" aria-describedby="planner-generate-hint">
            {isPreparingPlan ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
            {t(isPreparingPlan ? "piano.preparingPlan" : "piano.preparePlan")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={t("piano.planMenu")}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onOpenHistory} className="min-h-11">
                <History className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("piano.planHistory.title")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="planner-upcoming-section mb-5 min-w-0" aria-labelledby="planner-deadlines-heading">
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

      <div key={`${view}-${selectedKey}`} className={cn(viewChanged && "planner-view-enter", view === "month" && monthChanged && "planner-month-enter", direction < 0 && "planner-motion-back")}>
        {view === "day" && (
          <section className="planner-day-view" aria-labelledby="planner-calendar-heading">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="planner-calendar-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{capitalizeFirstLetter(format(selectedDate, "EEEE d MMMM", { locale }))}</h3>
                <p className="mt-1 text-base text-muted-foreground">{t("piano.dailySubtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => changeView("month")} className="-ml-4"><ArrowLeft aria-hidden="true" />{t("piano.backToCalendar")}</Button>
                <Button variant="outline" onClick={goToday}>{t("piano.today")}</Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.previousDay")} onClick={() => changeDay(dayKey(addDays(selectedDate, -1)))}><ChevronLeft aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.nextDay")} onClick={() => changeDay(dayKey(addDays(selectedDate, 1)))}><ChevronRight aria-hidden="true" /></Button>
              </div>
            </div>
            <DayTimeline dateKey={selectedKey} entries={selectedDayEntries} exitingIds={exitingIds}
              routines={routines} routinesLoading={routinesLoading}
              onEdit={(entry) => entry.original.kind === "evaluation" ? onEditEvaluation(entry.original.data) : onEditStudyEvent(entry.original.data)}
              onDelete={(entry) => entry.original.kind === "evaluation" ? onDeleteEvaluation(entry.original.data) : onDeleteStudyEvent(entry.original.data)}
              onMove={onMoveSlot ? requestMove : undefined}
              onMoveInteractionChange={onMoveInteractionChange} />
          </section>
        )}

        {view === "week" && (
          <section className="planner-week-panel" aria-labelledby="planner-week-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 id="planner-week-heading" className="text-xl font-semibold" aria-live="polite">{format(weekDays[0], "d MMM", { locale })} – {format(weekDays[6], "d MMM yyyy", { locale })}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label={t("piano.previousWeek")} onClick={() => changeWeek(-1)}><ChevronLeft aria-hidden="true" /></Button>
                <Button variant="outline" onClick={goToday}>{t("piano.today")}</Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.nextWeek")} onClick={() => changeWeek(1)}><ChevronRight aria-hidden="true" /></Button>
              </div>
            </div>
            <WeekStrip selectedKey={selectedKey} selectedDate={selectedDate} entriesByKey={entriesByKey} onSelectDay={changeDay} />
            <WeekView selectedKey={selectedKey} selectedDate={selectedDate} entriesByKey={entriesByKey} onSelectDay={changeDay} onOpenSlot={openSlot} />
          </section>
        )}

        {view === "month" && (
          <section className="border border-border bg-sheet" aria-label={t("piano.calendar")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-5">
              <h3 className="text-xl font-semibold" aria-live="polite">{capitalizeFirstLetter(format(monthStart, "MMMM yyyy", { locale }))}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={goToday}>{t("piano.today")}</Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.previousMonth")} onClick={() => changeMonth(-1)}><ChevronLeft aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon" aria-label={t("piano.nextMonth")} onClick={() => changeMonth(1)}><ChevronRight aria-hidden="true" /></Button>
              </div>
            </div>
            <div className="planner-month-grid planner-month-grid--calendar" role="grid" aria-label={t("piano.monthGridLabel")} ref={monthGridRef}>
              <div className="planner-month-weekdays" role="row">
                {weekDays.map((date) => (
                  <span key={format(date, "EEE", { locale })} role="columnheader" className="py-2 text-center text-sm font-medium text-muted-foreground">
                    <span className="sm:hidden">{format(date, "EEEEE", { locale })}</span>
                    <span className="hidden sm:inline">{format(date, "EEE", { locale })}</span>
                  </span>
                ))}
              </div>
              {monthWeeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="planner-month-row" role="row">
                  {week.map((date) => {
                    const key = dayKey(date);
                    const dayEntries = entriesByKey.get(key) ?? [];
                    const { verifications, study, commitments } = dayCounts(dayEntries);
                    const accessibleDay = format(date, "EEEE d MMMM yyyy", { locale });
                    return <div key={key} role="gridcell" aria-selected={key === selectedKey} className="planner-month-cell">
                      <button type="button" aria-current={isToday(date) ? "date" : undefined} aria-label={t("piano.calendarDayCounts", { day: accessibleDay, verifications, study, commitments })}
                        aria-pressed={key === selectedKey} tabIndex={key === selectedKey ? 0 : -1} data-day-key={key} data-plan-opener={`day-${key}`}
                        onKeyDown={(event) => handleMonthKeyDown(event, date)} onClick={() => openDay(key)} data-haptic="medium"
                        className={cn("planner-day", key === selectedKey && "planner-day-selected", !isSameMonth(date, monthStart) && "planner-day-outside", isToday(date) && "planner-day-today")}>
                        <span className="planner-day-number">{format(date, "d")}</span>
                        {dayEntries.length > 0 && <>
                          <span className="planner-day-markers" aria-hidden="true">
                            {verifications > 0 && <span className="planner-day-mark planner-day-mark--evaluation" data-marker-kind="evaluation" />}
                            {study > 0 && <span className="planner-day-mark planner-day-mark--study" data-marker-kind="study" />}
                            {commitments > 0 && <span className="planner-day-mark planner-day-mark--commitment" data-marker-kind="commitment" />}
                          </span>
                          <span className="planner-day-titles" aria-hidden="true">{dayEntries.slice(0, 2).map((entry) => <span key={`${entry.original.kind}-${entry.id}`} className={cn("truncate", entry.completed && "line-through")}>{entry.time && `${entry.time} `}{entry.title}</span>)}{dayEntries.length > 2 && <span>+{dayEntries.length - 2}</span>}</span>
                        </>}
                      </button>
                    </div>;
                  })}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <p id="planner-generate-hint" className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t(showGeneratePlan ? "piano.generateHint" : "piano.generateUnavailable")}</p>
      <div className="planner-bottom-safe-space" aria-hidden="true" />

      {onMoveSlot && (
        <MoveSlotSheet
          request={moveRequest}
          entries={entries}
          routines={routines}
          routinesLoading={routinesLoading}
          isSaving={isMoving}
          onOpenChange={(open) => {
            if (open) onMoveSheetOpenChange?.(true);
            else closeMoveSheet();
          }}
          onSave={onMoveSlot}
        />
      )}

      <Dialog open={!!slotId} onOpenChange={(open) => { if (!open) closeSlot(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSlot?.title ?? t("piano.slotUnavailable")}</DialogTitle>
            {selectedSlot && <DialogDescription>
              {[
                selectedSlot.subject,
                selectedSlot.kind === "study" ? t("piano.type_study")
                  : selectedSlot.kind === "evaluation" ? t("piano.type_test")
                    : selectedSlot.kind === "personal" ? t("piano.timelineBusy") : t("piano.type_assignment"),
                format(selectedSlot.date, "EEEE d MMMM yyyy", { locale }),
                selectedSlot.time,
                selectedSlot.endTime,
              ].filter(Boolean).join(" · ")}
            </DialogDescription>}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
