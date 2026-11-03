import type { FocusTask } from "@/contexts/FocusContext";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import {
  plannerDateKey,
  plannerDateTimeParts,
  plannerMinutesToTime,
  plannerTimeToMinutes,
  plannerWeekday,
  type PlannerRoutine,
} from "@/lib/planner/freeTime";
import { routineSegmentsForDay } from "@/lib/weekPlanner";
import type { ReplanSlot } from "@/lib/planner/replan";
import type { PlanChange, PlanChangeEventValues, PlanChangeSnapshot } from "@/lib/planner/types";

const OVERRUN_DELAY_MS = 2 * 60 * 1000;
const EARLY_FINISH_ADVANCE_MS = 10 * 60 * 1000;
const REQUESTED_EXTENSION_MINUTES = 10;

export interface ScheduleItem {
  label: string;
  time: string;
  day: string;
  kind: "event" | "routine";
}

export interface SlotExtension {
  minutes: number;
  changes: PlanChange[];
}

export interface ExtensionLimit {
  minutes: number;
  time: string | null;
  item: string | null;
}

export interface EarlyFinishPrompt {
  sessionKey: string;
  event: StudyEvent;
  subject: string;
  lessonFrom: number | null;
  lessonTo: number | null;
  nextItem: ScheduleItem | null;
  nextStudyEvent: StudyEvent | null;
}

function dateParts(day: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const [, yearValue, monthValue, dateValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const date = Number(dateValue);
  const check = new Date(Date.UTC(year, month - 1, date));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) return null;
  return [year, month, date];
}

/** Convert a Europe/Rome calendar date and wall clock into an absolute instant. */
export function romeDateTimeToInstant(day: string, time: string): number | null {
  const date = dateParts(day);
  const minute = plannerTimeToMinutes(time);
  const secondMatch = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::([0-5]\d))?$/.exec(time);
  if (!date || minute === null || !secondMatch) return null;
  const [year, month, dateOfMonth] = date;
  const hour = Math.floor(minute / 60);
  const minutePart = minute % 60;
  const second = Number(secondMatch[1] ?? 0);
  const wallClockAsUtc = Date.UTC(year, month - 1, dateOfMonth, hour, minutePart, second);
  let guess = wallClockAsUtc;

  // Resolve the timezone offset from the helper's Europe/Rome wall-clock fields.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = plannerDateTimeParts(new Date(guess));
    if (!parts) return null;
    const [partYear, partMonth, partDate] = dateParts(parts.day) ?? [];
    if (partYear === undefined || partMonth === undefined || partDate === undefined) return null;
    const representedAsUtc = Date.UTC(partYear, partMonth - 1, partDate, parts.hour, parts.minute, parts.second);
    const adjustment = wallClockAsUtc - representedAsUtc;
    if (adjustment === 0) {
      return parts.day === day
        && parts.hour === hour
        && parts.minute === minutePart
        && parts.second === second
        ? guess
        : null;
    }
    guess += adjustment;
  }
  return null;
}

export function getStudyEventEndInstant(event: Pick<StudyEvent, "event_date" | "event_time" | "end_time">): number | null {
  if (!event.event_time || !event.end_time) return null;
  const day = plannerDateKey(event.event_date);
  return day ? romeDateTimeToInstant(day, event.end_time) : null;
}

export function isEligiblePlannedStudy(task: Pick<FocusTask, "eventId" | "sourceType"> | null, event: StudyEvent | null): boolean {
  if (!task?.eventId || task.sourceType === "adhoc" || !event || task.eventId !== event.id) return false;
  const status = event.status ?? (event.is_completed ? "done" : "planned");
  return event.event_type === "study"
    && !!event.event_time
    && !!event.end_time
    && status !== "done"
    && status !== "skipped"
    && event.is_completed !== true
    && getStudyEventEndInstant(event) !== null;
}

export function isSlotOverrunThresholdReached(event: StudyEvent, now: number): boolean {
  const end = getStudyEventEndInstant(event);
  return end !== null && now >= end + OVERRUN_DELAY_MS;
}

export function isAtLeastTenMinutesEarly(event: StudyEvent, endedAt: number): boolean {
  const end = getStudyEventEndInstant(event);
  return end !== null && endedAt <= end - EARLY_FINISH_ADVANCE_MS;
}

function eventDay(event: Pick<StudyEvent, "event_date">): string | null {
  return plannerDateKey(event.event_date);
}

function eventInterval(event: StudyEvent, day: string): { start: number; end: number } | null {
  if (eventDay(event) !== day) return null;
  const start = plannerTimeToMinutes(event.event_time);
  if (start === null) return null;
  const explicitEnd = plannerTimeToMinutes(event.end_time);
  const end = explicitEnd === null ? Math.min(start + 60, 24 * 60) : explicitEnd > start ? explicitEnd : 24 * 60;
  return end > start ? { start, end } : null;
}

function snapshotForEvent(event: StudyEvent): PlanChangeSnapshot {
  return {
    completed_at: event.completed_at ?? null,
    context_id: event.context_id ?? null,
    end_time: event.end_time ?? null,
    event_date: event.event_date,
    event_time: event.event_time ?? null,
    event_type: event.event_type,
    evaluation_id: event.evaluation_id ?? null,
    id: event.id,
    is_completed: event.is_completed ?? event.status === "done",
    lesson_from: event.lesson_from ?? null,
    lesson_to: event.lesson_to ?? null,
    locked: event.locked ?? false,
    move_count: event.move_count ?? 0,
    notes: event.notes ?? null,
    original_date: event.original_date ?? null,
    original_time: event.original_time ?? null,
    source: event.source ?? "manual",
    status: event.status ?? "planned",
    subject: event.subject,
    title: event.title,
    version: event.version ?? 0,
  };
}

function updateEventChange(event: StudyEvent, after: PlanChangeEventValues): PlanChange | null {
  if (!Number.isInteger(event.version) || (event.version as number) < 0) return null;
  return {
    op: "update",
    event_id: event.id,
    version: event.version as number,
    before: snapshotForEvent(event),
    after,
  };
}

function routineIntervals(day: string, routines: readonly PlannerRoutine[]) {
  const weekday = plannerWeekday(day);
  return routines.flatMap((routine) => routineSegmentsForDay(
    routine.days_of_week ?? [],
    routine.start_time,
    routine.end_time,
    weekday,
  ).map((block) => ({
    ...block,
    label: routine.label?.trim() || routine.kind,
    kind: "routine" as const,
  })));
}

function protectedEventIntervals(day: string, events: readonly StudyEvent[], excludedIds: ReadonlySet<string>) {
  return events.flatMap((event) => {
    if (excludedIds.has(event.id)) return [];
    const interval = eventInterval(event, day);
    return interval ? [{ ...interval, label: event.title || event.subject || "", kind: "event" as const }] : [];
  });
}

function overlaps(left: { start: number; end: number }, right: { start: number; end: number }): boolean {
  return left.start < right.end && right.start < left.end;
}

function isMovableStudyEvent(event: StudyEvent): boolean {
  const status = event.status ?? (event.is_completed ? "done" : "planned");
  return event.event_type === "study"
    && (status === "planned" || status === "partial")
    && event.is_completed !== true
    && event.locked !== true
    && Number.isInteger(event.version)
    && (event.version as number) >= 0;
}

/** One versioned package that extends a slot and shifts only the study slots it would touch. */
export function createSlotExtensionPlan(
  current: StudyEvent,
  events: readonly StudyEvent[],
  routines: readonly PlannerRoutine[],
  minutes: number,
): SlotExtension | null {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > REQUESTED_EXTENSION_MINUTES) return null;
  if (!Number.isInteger(current.version) || (current.version as number) < 0 || current.locked === true) return null;
  const currentStatus = current.status ?? (current.is_completed ? "done" : "planned");
  if ((currentStatus !== "planned" && currentStatus !== "partial") || current.is_completed) return null;
  const day = eventDay(current);
  const currentStart = plannerTimeToMinutes(current.event_time);
  const currentEnd = plannerTimeToMinutes(current.end_time);
  if (!day || currentStart === null || currentEnd === null || currentEnd <= currentStart) return null;
  const extendedEnd = currentEnd + minutes;
  if (extendedEnd >= 24 * 60) return null;

  const laterEvents = events
    .filter((event) => event.id !== current.id && eventDay(event) === day)
    .map((event) => ({ event, interval: eventInterval(event, day) }))
    .filter((item): item is { event: StudyEvent; interval: { start: number; end: number } } => !!item.interval)
    .filter(({ interval }) => interval.start >= currentEnd)
    .sort((left, right) => left.interval.start - right.interval.start || left.event.id.localeCompare(right.event.id));

  const shifted = new Map<string, { event: StudyEvent; start: number; end: number }>();
  let occupiedThrough = extendedEnd;
  for (const { event, interval } of laterEvents) {
    if (interval.start < occupiedThrough) {
      if (!isMovableStudyEvent(event)) return null;
      const start = interval.start + minutes;
      const end = interval.end + minutes;
      if (end >= 24 * 60) return null;
      shifted.set(event.id, { event, start, end });
      occupiedThrough = end;
    } else {
      occupiedThrough = interval.end;
    }
  }

  const shiftedIds = new Set(shifted.keys());
  const protectedIntervals = [
    ...routineIntervals(day, routines),
    ...protectedEventIntervals(day, events, new Set([current.id, ...shiftedIds])),
  ];
  const updatedCurrent = { start: currentStart, end: extendedEnd };
  if (protectedIntervals.some((interval) => overlaps(updatedCurrent, interval))) return null;

  const movedIntervals = [...shifted.values()].map(({ start, end }) => ({ start, end }));
  if (movedIntervals.some((interval) => protectedIntervals.some((protectedInterval) => overlaps(interval, protectedInterval)))) {
    return null;
  }
  for (let index = 0; index < movedIntervals.length; index += 1) {
    for (let other = index + 1; other < movedIntervals.length; other += 1) {
      if (overlaps(movedIntervals[index], movedIntervals[other])) return null;
    }
  }

  const currentChange = updateEventChange(current, { end_time: plannerMinutesToTime(extendedEnd) });
  if (!currentChange) return null;
  const changes: PlanChange[] = [currentChange];
  for (const { event, start, end } of [...shifted.values()].sort((left, right) => left.start - right.start)) {
    const change = updateEventChange(event, {
      event_time: plannerMinutesToTime(start),
      end_time: plannerMinutesToTime(end),
    });
    if (!change) return null;
    changes.push(change);
  }
  return { minutes, changes };
}

export function getSlotExtensionLimit(
  current: StudyEvent,
  events: readonly StudyEvent[],
  routines: readonly PlannerRoutine[],
): ExtensionLimit {
  let allowed = 0;
  for (let minutes = REQUESTED_EXTENSION_MINUTES; minutes >= 1; minutes -= 1) {
    if (createSlotExtensionPlan(current, events, routines, minutes)) {
      allowed = minutes;
      break;
    }
  }
  const day = eventDay(current);
  const end = plannerTimeToMinutes(current.end_time);
  if (!day || end === null) return { minutes: allowed, time: null, item: null };
  const protectedEvents = events.filter((event) => event.event_type !== "study" || !isMovableStudyEvent(event));
  const protectedItems = [
    ...routineIntervals(day, routines),
    ...protectedEventIntervals(day, protectedEvents, new Set([current.id])),
  ].filter((item) => item.start >= end).sort((left, right) => left.start - right.start);
  const blocker = protectedItems.find((item) => item.start <= end + REQUESTED_EXTENSION_MINUTES);
  return {
    minutes: allowed,
    time: blocker ? plannerMinutesToTime(blocker.start) : null,
    item: blocker?.label || null,
  };
}

export function findNextScheduleItem(
  day: string,
  fromMinute: number,
  currentEventId: string,
  events: readonly StudyEvent[],
  routines: readonly PlannerRoutine[],
): ScheduleItem | null {
  const items: Array<ScheduleItem & { minute: number }> = [];
  for (const event of events) {
    if (event.id === currentEventId || eventDay(event) !== day) continue;
    const status = event.status ?? (event.is_completed ? "done" : "planned");
    if (status === "done" || status === "skipped" || event.is_completed) continue;
    const start = plannerTimeToMinutes(event.event_time);
    if (start === null || start < fromMinute) continue;
    items.push({
      label: event.title?.trim() || event.subject || "",
      time: plannerMinutesToTime(start),
      day,
      kind: "event",
      minute: start,
    });
  }
  for (const routine of routines) {
    for (const block of routineIntervals(day, [routine])) {
      if (block.start < fromMinute) continue;
      items.push({
        label: block.label,
        time: plannerMinutesToTime(block.start),
        day,
        kind: "routine",
        minute: block.start,
      });
    }
  }
  const next = items.sort((left, right) => left.minute - right.minute || left.kind.localeCompare(right.kind))[0];
  if (!next) return null;
  const { minute: _minute, ...scheduleItem } = next;
  return scheduleItem;
}

export function findNextStudyEvent(
  current: StudyEvent,
  events: readonly StudyEvent[],
): StudyEvent | null {
  const day = eventDay(current);
  const afterMinute = plannerTimeToMinutes(current.end_time);
  if (!day || afterMinute === null) return null;
  return events
    .filter((event) => {
      if (event.id === current.id || event.event_type !== "study" || eventDay(event) !== day) return false;
      const start = plannerTimeToMinutes(event.event_time);
      const status = event.status ?? (event.is_completed ? "done" : "planned");
      return start !== null
        && start >= afterMinute
        && status !== "done"
        && status !== "skipped"
        && event.is_completed !== true;
    })
    .sort((left, right) =>
      (plannerTimeToMinutes(left.event_time) ?? 0) - (plannerTimeToMinutes(right.event_time) ?? 0)
      || left.id.localeCompare(right.id),
    )[0] ?? null;
}

export function toReplanSlot(event: StudyEvent): ReplanSlot {
  const status = event.status ?? (event.is_completed ? "done" : "planned");
  return {
    completed_at: event.completed_at ?? null,
    context_id: event.context_id ?? null,
    end_time: event.end_time ?? null,
    event_date: event.event_date,
    event_time: event.event_time ?? null,
    event_type: event.event_type,
    evaluation_id: event.evaluation_id ?? null,
    id: event.id,
    is_completed: event.is_completed ?? status === "done",
    lesson_from: event.lesson_from ?? null,
    lesson_to: event.lesson_to ?? null,
    locked: event.locked ?? false,
    move_count: event.move_count ?? 0,
    notes: event.notes ?? null,
    original_date: event.original_date ?? null,
    original_time: event.original_time ?? null,
    source: event.source ?? "manual",
    status,
    subject: event.subject,
    title: event.title,
    version: event.version ?? 0,
  };
}

export function taskFromEvent(event: StudyEvent): FocusTask {
  const start = plannerTimeToMinutes(event.event_time);
  const end = plannerTimeToMinutes(event.end_time);
  const durationMinutes = start !== null && end !== null && end > start ? end - start : 25;
  return {
    label: event.title || event.subject,
    subject: event.subject,
    eventId: event.id,
    sourceType: "planned",
    durationMinutes,
    lessonFrom: event.lesson_from ?? null,
    lessonTo: event.lesson_to ?? null,
  };
}

export function subjectAndLessons(event: StudyEvent, task: FocusTask) {
  return {
    subject: event.subject?.trim() || task.subject?.trim() || event.title || task.label,
    lessonFrom: event.lesson_from ?? task.lessonFrom ?? null,
    lessonTo: event.lesson_to ?? task.lessonTo ?? null,
  };
}
