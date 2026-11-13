import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronLeft, ChevronRight, Columns3, Grid, Loader2, PencilLine, Plus, Trash2, Check } from "lucide-react";
import {
  addDays, addMonths, endOfWeek, format, isSameMonth,
  isToday, isValid, parseISO, startOfMonth, startOfWeek,
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
import { subjectHex, subjectTint } from "@/lib/pianoPalette";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DayTimeline } from "./DayTimeline";
import { MoveSlotSheet, type MoveSlotRequest } from "./MoveSlotSheet";
import type { MoveSlotSaveTarget, MoveSlotTarget } from "@/lib/planner/conflicts";

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
  onToggleComplete?: (entry: PlannerEntry) => void;
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
  onPreparePlan, isPreparingPlan, onEditEvaluation, onEditStudyEvent,
  onDeleteEvaluation, onDeleteStudyEvent, onMoveSlot, isMoving = false,
  onMoveSheetOpenChange, onMoveInteractionChange, onToggleComplete,
}: AppointmentsCalendarProps) {
  const { t, i18n } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const { data: routineData, isLoading: routinesLoading } = useUserRoutines();
  const routines = routineData ?? EMPTY_ROUTINES;
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const [params, setParams] = useSearchParams();
  const rawView = params.get("view");
  const rawDay = params.get("planDay");
  const parsedView: CalendarView = isCalendarView(rawView) ? rawView : "month";
  const view: CalendarView = parsedView === "week" ? "month" : parsedView;
  const todayKey = dayKey(new Date());
  const selectedKey = isDateKey(rawDay) ? rawDay : todayKey;
  const selectedDate = parseISO(selectedKey);
  const [keyboardMotion, setKeyboardMotion] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const screenRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const monthGridRef = useRef<HTMLDivElement>(null);
  const previousView = useRef<CalendarView>(view);
  const previousDayKey = useRef(selectedKey);
  const monthOpenerKey = useRef<string | null>(null);
  const pendingMonthFocus = useRef<string | null>(null);
  const overviewScroll = useRef(0);
  const scrollOwnerRef = useRef<HTMLElement | null>(null);
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
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", nextView);
      next.set("planDay", nextDay);
      next.delete("slot");
      return next;
    }, { replace: true });
  };

  const openDay = (key: string) => {
    if (view === "month") {
      monthOpenerKey.current = key;
      captureMonthPosition();
    }
    replaceCalendarState("day", key);
  };

  const changeDay = (key: string) => replaceCalendarState(view === "day" ? "day" : "month", key);
  const goToday = () => replaceCalendarState(view === "day" ? "day" : "month", todayKey);
  const changeMonth = (offset: number) => {
    const nextKey = dayKey(addMonths(monthStart, offset));
    pendingMonthFocus.current = nextKey;
    replaceCalendarState("month", nextKey);
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

  const selectedDayEntries = entriesByKey.get(selectedKey) ?? [];
  const monthGroups = monthDays.flatMap((date) => {
    if (!isSameMonth(date, monthStart)) return [];
    const key = dayKey(date);
    const dayEntries = entriesByKey.get(key) ?? [];
    return dayEntries.length > 0 ? [{ key, date, entries: dayEntries }] : [];
  });
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
  return (
    <div ref={screenRef} className={cn("planner-workspace min-w-0 scroll-mt-20 py-5", keyboardMotion && "planner-no-motion")} onClickCapture={(event) => setKeyboardMotion(event.detail === 0)}>
      <header className="mb-4 flex items-center gap-2">
        <h2 id="planner-calendar-heading" className="min-w-0 flex-1 truncate text-2xl font-normal tracking-tight text-white sm:text-3xl">
          {capitalizeFirstLetter(format(monthStart, "MMMM yyyy", { locale }))}
        </h2>
        <button
          type="button"
          aria-pressed={listOpen}
          aria-controls="planner-month-events"
          aria-label={t(listOpen ? "piano.hideCommitments" : "piano.showCommitments")}
          onClick={() => setListOpen((open) => !open)}
          className="relative flex h-11 w-[4.75rem] shrink-0 items-center justify-between rounded-full border border-[#212327] bg-[#191919] px-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4]"
        >
          <span
            aria-hidden="true"
            className="absolute left-1 top-1 h-9 w-9 rounded-full bg-[#FFFBF4] transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: listOpen ? "translateX(1.6rem)" : "translateX(0)" }}
          />
          <Grid aria-hidden="true" className={cn("relative z-[1] h-4 w-4", listOpen ? "text-[#dadbdf]" : "text-[#0a0a0a]")} />
          <Columns3 aria-hidden="true" className={cn("relative z-[1] h-4 w-4", listOpen ? "text-[#0a0a0a]" : "text-[#dadbdf]")} />
        </button>
        <button
          type="button"
          aria-label={t("piano.addEventFull")}
          data-haptic="medium"
          onClick={() => onAddEvent(selectedKey)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[24px] bg-[#FFFBF4] text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4] active:scale-[0.98]"
        >
          <Plus aria-hidden="true" />
        </button>
      </header>

      <section className="min-w-0" aria-label={t("piano.calendar")}>
        <div className="planner-month-weekdays mb-2 grid grid-cols-7 gap-2" role="row">
          {weekDays.map((date) => (
            <span key={format(date, "EEE", { locale })} role="columnheader" className="py-1 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-[#D8CFBC]">
              <span className="sm:hidden">{format(date, "EEEEE", { locale })}</span>
              <span className="hidden sm:inline">{format(date, "EEE", { locale })}</span>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2" role="grid" aria-label={t("piano.monthGridLabel")} ref={monthGridRef}>
          {monthWeeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="contents" role="row">
              {week.map((date) => {
                const key = dayKey(date);
                const dayEntries = entriesByKey.get(key) ?? [];
                const { verifications, study, commitments } = dayCounts(dayEntries);
                const inMonth = isSameMonth(date, monthStart);
                const today = isToday(date);
                const selected = key === selectedKey;
                const paint = dayPaint(dayEntries, today, inMonth, selected);
                const accessibleDay = format(date, "EEEE d MMMM yyyy", { locale });
                return (
                  <div key={key} role="gridcell" aria-selected={selected} className="min-w-0">
                    <button
                      type="button"
                      aria-current={today ? "date" : undefined}
                      aria-label={t("piano.calendarDayCounts", { day: accessibleDay, verifications, study, commitments })}
                      aria-pressed={selected}
                      tabIndex={selected ? 0 : -1}
                      data-day-key={key}
                      data-plan-opener={`day-${key}`}
                      onKeyDown={(event) => handleMonthKeyDown(event, date)}
                      onClick={() => openDay(key)}
                      data-haptic="medium"
                      className="relative flex h-16 w-full items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4] active:scale-[0.98]"
                      style={paint.style}
                    >
                      <span className={cn("text-sm tabular-nums", today && "underline decoration-2 underline-offset-4")}>{format(date, "d")}</span>
                      {paint.hexes.length > 1 && (
                        <span className="absolute bottom-1.5 left-1.5 flex gap-0.5" aria-hidden="true">
                          {paint.hexes.slice(0, 3).map((hex) => (
                            <span key={hex} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
                          ))}
                        </span>
                      )}
                      {dayEntries.length > 0 && (
                        <span className="absolute bottom-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1 font-mono text-[10px] font-medium tabular-nums text-[#D8CFBC]" aria-hidden="true">
                          {dayEntries.length}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={t("piano.previousMonth")} onClick={() => changeMonth(-1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => replaceCalendarState("month", todayKey)}>{t("piano.today")}</Button>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={t("piano.nextMonth")} onClick={() => changeMonth(1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onPreparePlan} disabled={!showGeneratePlan || isPreparingPlan} data-haptic="medium" aria-describedby="planner-generate-hint">
          {isPreparingPlan ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
          {t(isPreparingPlan ? "piano.preparingPlan" : "piano.preparePlan")}
        </Button>
      </div>
      <p id="planner-generate-hint" className="mt-3 max-w-prose text-sm leading-relaxed text-[#dadbdf]">{t(showGeneratePlan ? "piano.generateHint" : "piano.generateUnavailable")}</p>

      <AnimatePresence initial={false}>
        {listOpen && (
          <motion.section
            key="month-events"
            id="planner-month-events"
            aria-label={t("piano.monthCommitments")}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6"
          >
            {monthGroups.length === 0 ? (
              <p className="text-base text-[#dadbdf]">{t("piano.monthEmpty")}</p>
            ) : (
              <div className="space-y-5">
                {monthGroups.map((group) => (
                  <section key={group.key}>
                    <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-[#D8CFBC]">
                      <time dateTime={group.key}>{capitalizeFirstLetter(format(group.date, "EEEE d MMMM", { locale }))}</time>
                    </h3>
                    <ul className="space-y-2">
                      {group.entries.map((entry) => {
                        const tint = subjectTint(entry.subject, true, entry.customColor);
                        return (
                          <li key={`${entry.original.kind}-${entry.id}`}>
                            <article className="flex items-center gap-3 rounded-[24px] px-4 py-3" style={{ backgroundColor: tint.backgroundColor, border: tint.border }}>
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-[11px] uppercase tracking-[0.08em]" style={{ color: tint.dot }}>{entry.subject ?? t("piano.evaluation")}</p>
                                <p className={cn("mt-1 text-base text-white", entry.completed && "line-through")}>{entry.title}</p>
                                {entry.time && <p className="mt-1 text-sm text-[#dadbdf]">{entry.endTime ? `${entry.time.slice(0, 5)}-${entry.endTime.slice(0, 5)}` : entry.time.slice(0, 5)}</p>}
                              </div>
                              <button
                                type="button"
                                aria-pressed={entry.completed}
                                aria-label={`${t(entry.completed ? "piano.slotUndo" : "piano.slotMarkDone")} ${entry.title}`}
                                onClick={() => onToggleComplete?.(entry)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4]"
                              >
                                <Check aria-hidden="true" className={cn("h-4 w-4", !entry.completed && "opacity-40")} />
                              </button>
                              <button
                                type="button"
                                aria-label={t("piano.editEntry", { title: entry.title })}
                                onClick={() => entry.original.kind === "evaluation" ? onEditEvaluation(entry.original.data) : onEditStudyEvent(entry.original.data)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4]"
                              >
                                <PencilLine aria-hidden="true" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={t("piano.deleteEntry", { title: entry.title })}
                                onClick={() => entry.original.kind === "evaluation" ? onDeleteEvaluation(entry.original.data) : onDeleteStudyEvent(entry.original.data)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFBF4]"
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                              </button>
                            </article>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <Sheet
        open={view === "day"}
        onOpenChange={(open) => { if (!open) replaceCalendarState("month", selectedKey); }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto border-[#212327] bg-[#191919] pb-safe"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            headingRef.current?.focus();
          }}
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle ref={headingRef} tabIndex={-1} className="text-left text-2xl font-normal tracking-tight text-white outline-none sm:text-3xl">
              {capitalizeFirstLetter(format(selectedDate, "EEEE d MMMM", { locale }))}
            </SheetTitle>
          </SheetHeader>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => replaceCalendarState("month", selectedKey)}>{t("piano.backToCalendar")}</Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => goToday()}>{t("piano.today")}</Button>
            <Button type="button" variant="ghost" size="icon" aria-label={t("piano.previousDay")} onClick={() => changeDay(dayKey(addDays(selectedDate, -1)))}><ChevronLeft aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={t("piano.nextDay")} onClick={() => changeDay(dayKey(addDays(selectedDate, 1)))}><ChevronRight aria-hidden="true" /></Button>
          </div>
          <DayTimeline
            dateKey={selectedKey}
            entries={selectedDayEntries}
            exitingIds={exitingIds}
            routines={routines}
            routinesLoading={routinesLoading}
            onEdit={(entry) => entry.original.kind === "evaluation" ? onEditEvaluation(entry.original.data) : onEditStudyEvent(entry.original.data)}
            onDelete={(entry) => entry.original.kind === "evaluation" ? onDeleteEvaluation(entry.original.data) : onDeleteStudyEvent(entry.original.data)}
            onMove={onMoveSlot ? requestMove : undefined}
            onMoveInteractionChange={onMoveInteractionChange}
          />
        </SheetContent>
      </Sheet>

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
      <div className="planner-bottom-safe-space" aria-hidden="true" />
    </div>
  );
}

function dayPaint(entries: readonly PlannerEntry[], today: boolean, inMonth: boolean, selected: boolean) {
  const hexes = [...new Set(entries.map((entry) => subjectHex(entry.subject, entry.customColor)))];
  const tint = hexes.length === 1 ? subjectTint(entries[0]?.subject, true, entries[0]?.customColor) : null;
  return {
    hexes,
    style: {
      backgroundColor: tint?.backgroundColor ?? (today ? "#565449" : inMonth ? "#191919" : "#0a0a0a"),
      border: selected ? "1px solid #FFFBF4" : (tint?.border ?? "1px solid #212327"),
      borderRadius: 24,
      color: inMonth || today ? "#ffffff" : "#7d8187",
    },
  };
}
