import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getISODay, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useLessonsQuery } from "@/hooks/useLessons";
import type { UserRoutine } from "@/hooks/useUserRoutines";
import { comparePlannerEntries, validEventTime, type PlannerEntry } from "@/lib/plannerEntries";
import { plannerDateKey, plannerDateTimeParts } from "@/lib/planner/freeTime";
import { pauses, type TimelineSegment } from "@/lib/planner/schedule";
import { routineSegmentsForDay, timeToMinutes } from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";
import { NowLine } from "./NowLine";
import { PlanSlot, type PlanSlotData } from "./PlanSlot";

interface DayTimelineProps {
  dateKey: string;
  entries: PlannerEntry[];
  exitingIds: string[];
  onEdit: (entry: PlannerEntry) => void;
  onDelete: (entry: PlannerEntry) => void;
  /** Routine data is read-only; when omitted the current user's routines are queried here. */
  routines?: UserRoutine[];
  routinesLoading?: boolean;
  /** A deterministic clock can be injected by tests; production follows the Rome clock. */
  now?: Date;
}

interface TimelineItem {
  key: string;
  start: number;
  end: number;
  slot: PlanSlotData;
  entry?: PlannerEntry;
  showActions: boolean;
  exiting: boolean;
  effectiveEnd?: number;
}

interface PositionedTimelineItem extends TimelineItem {
  lane: number;
  laneCount: number;
}

const DEFAULT_WAKE_MINUTE = 7 * 60;
const DEFAULT_BEDTIME_MINUTE = 23 * 60;
const MIN_SLOT_HEIGHT = 44;
const EMPTY_ROUTINES: UserRoutine[] = [];

function minuteOf(value?: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.slice(0, 5))) return null;
  return timeToMinutes(value.slice(0, 5));
}

function minuteTime(value: number) {
  const clipped = Math.max(0, Math.min(24 * 60, value));
  const hours = Math.floor(clipped / 60);
  const minutes = clipped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDayRoutineSegments(dateKey: string, routines: readonly UserRoutine[]) {
  const date = parseISO(dateKey);
  const dayNumber = Number.isNaN(date.getTime()) ? 1 : getISODay(date);
  return routines.flatMap((routine, routineIndex) => routineSegmentsForDay(
    routine.days_of_week ?? [],
    routine.start_time,
    routine.end_time,
    dayNumber,
  ).map((segment, segmentIndex) => ({
    ...segment,
    routine,
    key: `${routine.id ?? `${routine.kind}-${routineIndex}`}-${segment.start}-${segment.end}-${segmentIndex}`,
  })));
}

function visibleRange(dateKey: string, routines: readonly UserRoutine[]) {
  const segments = getDayRoutineSegments(dateKey, routines);
  const sleep = segments.filter((segment) => segment.routine.kind === "sleep");
  const wake = sleep.filter((segment) => segment.start < 12 * 60 && segment.end <= 12 * 60)
    .reduce<number | null>((latest, segment) => Math.max(latest ?? 0, segment.end), null);
  const bedtime = sleep.filter((segment) => segment.start >= 17 * 60)
    .reduce<number | null>((earliest, segment) => Math.min(earliest ?? 24 * 60, segment.start), null);
  const startMinute = wake ?? DEFAULT_WAKE_MINUTE;
  const endMinute = bedtime ?? DEFAULT_BEDTIME_MINUTE;
  if (endMinute <= startMinute) return { startMinute: DEFAULT_WAKE_MINUTE, endMinute: DEFAULT_BEDTIME_MINUTE, routineSegments: segments };
  return { startMinute, endMinute, routineSegments: segments };
}

function slotKind(entry: PlannerEntry): PlanSlotData["kind"] {
  if (entry.kind === "study") return "study";
  if (entry.kind === "evaluation") return "evaluation";
  if (entry.kind === "personal") return "busy";
  return "assignment";
}

function entrySlot(entry: PlannerEntry, id = entry.id): PlanSlotData {
  const start = minuteOf(entry.time);
  const endTime = validEventTime(entry.endTime);
  const end = minuteOf(endTime);
  const duration = start !== null && end !== null && end > start ? end - start : null;
  return {
    id,
    kind: slotKind(entry),
    title: entry.title,
    subject: entry.subject,
    startTime: entry.time,
    endTime: duration !== null ? endTime : null,
    durationMinutes: duration,
    lessonFrom: entry.lessonFrom,
    lessonTo: entry.lessonTo,
    status: entry.status,
    completed: entry.completed,
    moveCount: entry.moveCount,
    originalDate: entry.originalDate,
    originalTime: entry.originalTime,
  };
}

function getPauseSegments(entry: PlannerEntry): TimelineSegment[] | null {
  const start = minuteOf(entry.time);
  const end = minuteOf(validEventTime(entry.endTime));
  if (
    entry.kind !== "study"
    || entry.status === "done"
    || entry.status === "skipped"
    || entry.completed
    || start === null
    || end === null
    || end <= start
    || entry.lessonFrom == null
    || entry.lessonTo == null
    || entry.lessonTo < entry.lessonFrom
  ) return null;

  const lessonCount = entry.lessonTo - entry.lessonFrom + 1;
  if (lessonCount < 1 || lessonCount > 120) return null;
  const targetElapsed = end - start;
  const averageMinutes = targetElapsed / lessonCount;
  const candidates = Array.from({ length: 50 }, (_, index) => index + 1).map((minutes) => {
    const estimates = Array.from({ length: lessonCount }, (_, index) => ({
      lesson_order: entry.lessonFrom! + index,
      minutes,
    }));
    const segments = pauses({
      event_time: entry.time!,
      lesson_from: entry.lessonFrom,
      lesson_to: entry.lessonTo,
    }, estimates);
    const last = segments[segments.length - 1];
    const elapsed = last ? last.end - start : 0;
    return { minutes, segments, elapsed, difference: Math.abs(elapsed - targetElapsed) };
  }).sort((a, b) => a.difference - b.difference || Math.abs(a.minutes - averageMinutes) - Math.abs(b.minutes - averageMinutes));

  const best = candidates[0];
  // Only show inferred breaks when the default pause engine reconstructs the
  // saved wall-clock duration closely; never add fictitious time to a slot.
  if (!best || best.difference > 1) return null;
  return best.segments;
}

function eventTimelineItems(entry: PlannerEntry, exitingIds: readonly string[]): TimelineItem[] {
  const start = minuteOf(entry.time);
  if (start === null) return [];
  const base = entrySlot(entry);
  const exiting = exitingIds.includes(entry.id);
  const segments = getPauseSegments(entry);
  if (!segments?.length) {
    const knownEnd = minuteOf(base.endTime);
    return [{
      key: entry.id,
      start,
      end: knownEnd !== null && knownEnd > start ? knownEnd : start + 1,
      slot: base,
      entry,
      showActions: true,
      exiting,
    }];
  }

  const fullStudyMinutes = segments.reduce((sum, segment) => sum + (segment.kind === "study" ? segment.duration : 0), 0);
  const fullSummary = {
    startTime: entry.time,
    endTime: base.endTime,
    durationMinutes: fullStudyMinutes,
    lessonFrom: entry.lessonFrom,
    lessonTo: entry.lessonTo,
  };
  let pauseNumber = 0;
  let firstPart = true;
  return segments.map((segment, index) => {
    if (segment.kind === "pause") pauseNumber += 1;
    const isStudy = segment.kind === "study";
    const isFirst = firstPart;
    firstPart = false;
    const startTime = minuteTime(segment.start);
    const endTime = minuteTime(segment.end);
    const slot: PlanSlotData = isStudy
      ? {
          ...base,
          id: `${entry.id}-study-${index}`,
          kind: "study",
          startTime,
          endTime,
          durationMinutes: segment.duration,
          lessonFrom: segment.lesson_from,
          lessonTo: segment.lesson_to,
          a11ySummary: isFirst ? fullSummary : undefined,
        }
      : {
          id: `${entry.id}-pause-${index}`,
          kind: "pause",
          title: null,
          startTime,
          endTime,
          durationMinutes: segment.duration,
          pauseNumber,
        };
    const segmentStart = segment.start;
    const segmentEnd = segment.end;
    return {
      key: slot.id,
      start: segmentStart,
      end: segmentEnd,
      slot,
      entry: isStudy ? entry : undefined,
      showActions: isStudy && isFirst,
      exiting,
    };
  });
}

function routineTimelineItems(
  routineSegments: ReturnType<typeof getDayRoutineSegments>,
): TimelineItem[] {
  return routineSegments.map((segment) => ({
    key: `routine-${segment.key}`,
    start: segment.start,
    end: segment.end,
    slot: {
      id: `routine-${segment.key}`,
      kind: "routine",
      title: segment.routine.label,
      routineLabel: segment.routine.label,
      routineKind: segment.routine.kind,
      startTime: minuteTime(segment.start),
      endTime: minuteTime(segment.end),
      durationMinutes: segment.end - segment.start,
    },
    showActions: false,
    exiting: false,
  }));
}

function layoutLanes(items: TimelineItem[], minimumHeightMinutes: number): PositionedTimelineItem[] {
  const sorted = items.map((item) => ({
    ...item,
    effectiveEnd: Math.max(item.end, item.start + minimumHeightMinutes),
  })).sort((a, b) => a.start - b.start || a.effectiveEnd! - b.effectiveEnd! || a.key.localeCompare(b.key));
  const result: PositionedTimelineItem[] = [];
  let cursor = 0;

  while (cursor < sorted.length) {
    const cluster: typeof sorted = [];
    let clusterEnd = sorted[cursor].effectiveEnd!;
    cluster.push(sorted[cursor]);
    cursor += 1;
    while (cursor < sorted.length && sorted[cursor].start < clusterEnd) {
      cluster.push(sorted[cursor]);
      clusterEnd = Math.max(clusterEnd, sorted[cursor].effectiveEnd!);
      cursor += 1;
    }

    const laneEnds: number[] = [];
    const assigned = cluster.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = item.effectiveEnd!;
      return { item, lane };
    });
    const laneCount = Math.max(1, laneEnds.length);
    assigned.forEach(({ item, lane }) => result.push({ ...item, lane, laneCount }));
  }
  return result.sort((a, b) => a.start - b.start || a.lane - b.lane || a.key.localeCompare(b.key));
}

function usePixelsPerHour() {
  const [pixelsPerHour, setPixelsPerHour] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches ? 80 : 96);
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    const update = () => setPixelsPerHour(media?.matches ? 80 : 96);
    update();
    media?.addEventListener?.("change", update);
    return () => media?.removeEventListener?.("change", update);
  }, []);
  return pixelsPerHour;
}

function PartialProgressSlot({
  item,
  position,
  onEdit,
  onDelete,
}: {
  item: PositionedTimelineItem;
  position: CSSProperties;
  onEdit: (entry: PlannerEntry) => void;
  onDelete: (entry: PlannerEntry) => void;
}) {
  const entry = item.entry!;
  const { data } = useLessonsQuery(entry.contextId);
  const lessonFrom = entry.lessonFrom ?? 0;
  const lessonTo = entry.lessonTo ?? (data?.lessons.length ? data.lessons.length - 1 : lessonFrom - 1);
  const total = lessonTo >= lessonFrom ? lessonTo - lessonFrom + 1 : data?.lessons.length ?? 0;
  const done = data?.completed.filter((order) => order >= lessonFrom && order <= lessonTo).length ?? 0;
  const partialProgress = data && total > 0 ? { done, total } : undefined;

  return <PlanSlot
    slot={item.slot}
    style={position}
    exiting={item.exiting}
    partialProgress={partialProgress}
    onEdit={item.showActions ? () => onEdit(entry) : undefined}
    onDelete={item.showActions ? () => onDelete(entry) : undefined}
  />;
}

function itemPosition(
  start: number,
  end: number,
  lane: number,
  laneCount: number,
  pixelsPerHour: number,
  visibleStart: number,
  visibleEnd: number,
  zIndex: number,
) {
  const clippedStart = Math.max(start, visibleStart);
  const clippedEnd = Math.min(end, visibleEnd);
  const top = ((clippedStart - visibleStart) / 60) * pixelsPerHour;
  const height = Math.max(MIN_SLOT_HEIGHT, ((Math.max(clippedStart, clippedEnd) - clippedStart) / 60) * pixelsPerHour);
  return {
    top,
    height,
    left: `${(lane / laneCount) * 100}%`,
    width: `${100 / laneCount}%`,
    zIndex: 2 + zIndex,
  };
}

export function DayTimeline({
  dateKey,
  entries,
  exitingIds,
  onEdit,
  onDelete,
  routines: suppliedRoutines,
  routinesLoading: suppliedRoutinesLoading,
  now,
}: DayTimelineProps) {
  const { t } = useTranslation();
  const routines = suppliedRoutines ?? EMPTY_ROUTINES;
  const routinesLoading = suppliedRoutinesLoading ?? false;
  const pixelsPerHour = usePixelsPerHour();
  const gridRef = useRef<HTMLDivElement>(null);
  const lastScrolledDay = useRef<string | null>(null);
  const frame = useMemo(() => visibleRange(dateKey, routines), [dateKey, routines]);
  const { startMinute, endMinute, routineSegments } = frame;
  const totalHeight = ((endMinute - startMinute) / 60) * pixelsPerHour;
  const minimumHeightMinutes = (MIN_SLOT_HEIGHT / pixelsPerHour) * 60;
  const allDay = useMemo(() => entries.filter((entry) => !entry.time).sort(comparePlannerEntries), [entries]);
  const timelineItems = useMemo(() => {
    const eventItems = entries.flatMap((entry) => eventTimelineItems(entry, exitingIds));
    const routineItems = routineTimelineItems(routineSegments);
    return layoutLanes(
      [...eventItems, ...routineItems].filter((item) => item.end > startMinute && item.start < endMinute),
      minimumHeightMinutes,
    );
  }, [entries, exitingIds, routineSegments, startMinute, endMinute, minimumHeightMinutes]);
  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    let mark = Math.ceil(startMinute / 60) * 60;
    if (startMinute % 60 !== 0) marks.push(startMinute);
    for (; mark <= endMinute; mark += 60) {
      if (mark >= startMinute && !marks.includes(mark)) marks.push(mark);
    }
    return marks;
  }, [startMinute, endMinute]);
  const clock = now ?? new Date();
  const todayKey = plannerDateKey(clock);
  const isToday = todayKey === dateKey;

  useEffect(() => {
    if (!isToday || routinesLoading || lastScrolledDay.current === dateKey) return;
    lastScrolledDay.current = dateKey;
    const current = plannerDateTimeParts(now ?? new Date());
    const track = gridRef.current;
    if (!current || !track) return;
    const targetMinute = Math.max(startMinute, Math.min(endMinute, current.hour * 60 + current.minute - 30));
    const offset = ((targetMinute - startMinute) / 60) * pixelsPerHour;
    const requestFrame = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0));
    const cancelFrame = window.cancelAnimationFrame ?? window.clearTimeout;
    const frameId = requestFrame(() => {
      const ownerCandidate = track.closest<HTMLElement>("#app-scroll-view");
      const owner = ownerCandidate && ["auto", "scroll"].includes(getComputedStyle(ownerCandidate).overflowY) ? ownerCandidate : null;
      const rect = track.getBoundingClientRect();
      const viewportTop = owner?.getBoundingClientRect().top ?? 0;
      const currentScroll = owner?.scrollTop ?? window.scrollY;
      const top = currentScroll + rect.top - viewportTop + offset;
      if (owner) owner.scrollTo({ top, behavior: "instant" });
      else window.scrollTo({ top, behavior: "instant" });
    });
    return () => cancelFrame(frameId);
  }, [dateKey, endMinute, isToday, now, pixelsPerHour, routinesLoading, startMinute]);

  const actionFor = (item: PositionedTimelineItem, kind: "edit" | "delete") => {
    if (!item.entry || !item.showActions) return undefined;
    return () => kind === "edit" ? onEdit(item.entry!) : onDelete(item.entry!);
  };

  return (
    <div className="planner-day-timeline" data-testid="day-timeline" style={{ overflowY: "visible" }}>
      {entries.length === 0 && !routinesLoading && <p className="planner-free-day">{t("piano.freeDay")}</p>}

      <section className="mb-4" aria-label={t("piano.withoutTime")}>
        <h3 className="mb-2 text-base font-semibold">{t("piano.withoutTime")}</h3>
        {allDay.length > 0
          ? <ol role="list" className="planner-day-untimed-list" aria-label={t("piano.timelineUntimedList")}>
              {allDay.map((entry) => (
                <PlanSlot
                  key={`untimed-${entry.kind}-${entry.id}`}
                  slot={entrySlot(entry)}
                  exiting={exitingIds.includes(entry.id)}
                  onEdit={() => onEdit(entry)}
                  onDelete={() => onDelete(entry)}
                />
              ))}
            </ol>
          : <p className="text-sm text-muted-foreground">{t("piano.noUntimedEvents")}</p>}
      </section>

      <section aria-labelledby="planner-timeline-title">
        <h3 id="planner-timeline-title" className="mb-2 text-base font-semibold">{t("piano.hourByHour")}</h3>
        <div className="planner-day-grid" data-start-minute={startMinute} data-end-minute={endMinute}>
          <div className="planner-day-hour-labels" aria-hidden="true" style={{ height: `${totalHeight}px` }}>
            {hourMarks.map((minute, index) => {
              const firstPartial = index === 0 && minute === startMinute && startMinute % 60 !== 0;
              const top = ((minute - startMinute) / 60) * pixelsPerHour;
              return <span key={minute} data-hour={Math.floor(minute / 60)} className={cn("planner-day-hour-label font-mono tabular-nums", firstPartial && "planner-day-hour-label--first")} style={{ top: `${top}px` }}>{minuteTime(minute)}</span>;
            })}
          </div>
          <div ref={gridRef} className="planner-day-grid-track" style={{ height: `${totalHeight}px`, overflowY: "visible" }}>
            {hourMarks.map((minute) => {
              const top = ((minute - startMinute) / 60) * pixelsPerHour;
              return <span key={`rule-${minute}`} className="planner-day-hour-rule" style={{ top: `${top}px` }} aria-hidden="true" />;
            })}
            <ol role="list" aria-label={t("piano.timelineListLabel")} className="planner-day-slot-list" style={{ height: `${totalHeight}px` }}>
              {timelineItems.map((item, index) => {
                const position = itemPosition(item.start, item.end, item.lane, item.laneCount, pixelsPerHour, startMinute, endMinute, index);
                const onEditAction = actionFor(item, "edit");
                const onDeleteAction = actionFor(item, "delete");
                if (item.entry?.status === "partial" && item.entry.contextId && item.showActions) {
                  return <PartialProgressSlot
                    key={item.key}
                    item={item}
                    position={position}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />;
                }
                return <PlanSlot
                  key={item.key}
                  slot={item.slot}
                  style={position}
                  exiting={item.exiting}
                  onEdit={onEditAction}
                  onDelete={onDeleteAction}
                />;
              })}
            </ol>
            <NowLine dateKey={dateKey} startMinute={startMinute} endMinute={endMinute} pixelsPerHour={pixelsPerHour} now={now} />
          </div>
        </div>
      </section>
    </div>
  );
}
