import type { StudyEventSource, StudyEventStatus } from "@/lib/planner/types";
import {
  freeSlots,
  routineDayWindow,
  routineSegmentsForDay,
  timeToMinutes,
  type TimeBlock,
} from "@/lib/weekPlanner";

export type PlannerDateInput = Date | string;

export interface PlannerRoutine {
  kind: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  id?: string;
  label?: string | null;
}

/** Minimal event shape needed to block time; accepts planner rows and hook events. */
export interface PlannerBusyEvent {
  event_date?: string;
  event_time?: string | null;
  end_time?: string | null;
  event_type?: string;
  subject?: string | null;
  status?: StudyEventStatus;
  is_completed?: boolean;
  source?: StudyEventSource;
  locked?: boolean;
  id?: string;
}

/** Settings accept both the persisted planner column names and ergonomic aliases. */
export interface PlannerSettings {
  lessons_per_block?: number;
  short_break_min?: number;
  medium_break_min?: number;
  long_break_min?: number;
  max_block_min?: number;
  daily_limit_school_min?: number;
  daily_limit_free_min?: number;
  lessonsPerBlock?: number;
  shortBreak?: number;
  mediumBreak?: number;
  longBreak?: number;
  longBreakEvery?: number;
  longBreakAfterMin?: number;
  maxBlock?: number;
  long_break_every?: number;
  long_break_after_min?: number;
  dailyLimitSchool?: number;
  dailyLimitFree?: number;
  shortBreakMin?: number;
  mediumBreakMin?: number;
  longBreakMin?: number;
  maxBlockMin?: number;
  dailyLimitSchoolMin?: number;
  dailyLimitFreeMin?: number;
  min_free_slot_min?: number;
  minFreeSlotMin?: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const ZONED_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const ROME_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const ROME_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function validDateKey(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function partsForRome(date: Date): Record<string, string> {
  return Object.fromEntries(ROME_DATE_TIME.formatToParts(date).map(({ type, value }) => [type, value]));
}

/** Converts a calendar date or instant to its Europe/Rome YYYY-MM-DD key. */
export function plannerDateKey(value: PlannerDateInput): string | null {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    const parts = Object.fromEntries(ROME_DATE.formatToParts(value).map(({ type, value: part }) => [type, part]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    return validDateKey(key) ? key : null;
  }

  const input = value.trim();
  const dateOnly = DATE_ONLY.exec(input)?.[0];
  if (dateOnly) return validDateKey(dateOnly) ? dateOnly : null;

  const localDateTime = LOCAL_DATE_TIME.exec(input);
  if (localDateTime && !ZONED_SUFFIX.test(input)) {
    const [, key] = localDateTime;
    return validDateKey(key) ? key : null;
  }

  const instant = new Date(input);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = Object.fromEntries(ROME_DATE.formatToParts(instant).map(({ type, value: part }) => [type, part]));
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return validDateKey(key) ? key : null;
}

/** Adds whole calendar days without consulting the machine's local timezone. */
export function addPlannerDays(day: string, amount: number): string {
  if (!validDateKey(day) || !Number.isFinite(amount)) return day;
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + Math.trunc(amount)));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/** ISO weekday (Monday=1 ... Sunday=7) for a YYYY-MM-DD calendar key. */
export function plannerWeekday(day: string): number {
  if (!validDateKey(day)) return 1;
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** Extracts local wall-clock fields in Europe/Rome from an explicit value. */
export function plannerDateTimeParts(value: PlannerDateInput): { day: string; hour: number; minute: number; second: number } | null {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    const parts = partsForRome(value);
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    if (!validDateKey(day)) return null;
    return { day, hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
  }

  const input = value.trim();
  const dateOnly = DATE_ONLY.exec(input)?.[0];
  if (dateOnly && validDateKey(dateOnly)) return { day: dateOnly, hour: 0, minute: 0, second: 0 };

  const localDateTime = LOCAL_DATE_TIME.exec(input);
  if (localDateTime && !ZONED_SUFFIX.test(input)) {
    const [, day, hour, minute, second = "0"] = localDateTime;
    if (!validDateKey(day)) return null;
    return { day, hour: Number(hour), minute: Number(minute), second: Number(second) };
  }

  const instant = new Date(input);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = partsForRome(instant);
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (!validDateKey(day)) return null;
  return { day, hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}

export function plannerTimeToMinutes(value: string | null | undefined): number | null {
  if (!value || !/^([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  return timeToMinutes(value);
}

export function plannerMinutesToTime(value: number): string {
  const minutes = Math.max(0, Math.min(24 * 60, Math.trunc(value)));
  if (minutes === 24 * 60) return "24:00";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function defaultTimeWindow(day: string, routines: readonly PlannerRoutine[]) {
  const dayN = plannerWeekday(day);
  const segments = routines.flatMap((routine) => {
    if (plannerTimeToMinutes(routine.start_time) === null || plannerTimeToMinutes(routine.end_time) === null) return [];
    return routineSegmentsForDay(
      routine.days_of_week ?? [],
      routine.start_time,
      routine.end_time,
      dayN,
    ).map((segment) => ({ ...segment, kind: routine.kind }));
  });
  const window = routineDayWindow(segments);
  return { dayN, segments, window };
}

function eventBlocksForDay(day: string, events: readonly PlannerBusyEvent[]): TimeBlock[] {
  const previousDay = addPlannerDays(day, -1);
  return events.flatMap((event) => {
    const eventDay = event.event_date ? plannerDateKey(event.event_date) : null;
    const start = plannerTimeToMinutes(event.event_time);
    if (eventDay === null || start === null) return [];

    const explicitEnd = plannerTimeToMinutes(event.end_time);
    if (eventDay === day) {
      if (explicitEnd === null) return [{ start, end: Math.min(start + 60, 24 * 60) }];
      if (explicitEnd > start) return [{ start, end: explicitEnd }];
      if (explicitEnd < start) return [{ start, end: 24 * 60 }];
      return [];
    }

    // Include the morning tail of an event that crosses midnight.
    if (eventDay === previousDay) {
      if (explicitEnd !== null && explicitEnd < start) return [{ start: 0, end: explicitEnd }];
      if (explicitEnd === null && start + 60 > 24 * 60) return [{ start: 0, end: start + 60 - 24 * 60 }];
    }
    return [];
  });
}

/**
 * Returns studyable minute windows for a calendar day in Europe/Rome.
 * Transport routines and timed events occupy time; no_study suppresses the day.
 */
export function freeWindows(
  day: PlannerDateInput,
  routines: readonly PlannerRoutine[] = [],
  busyEvents: readonly PlannerBusyEvent[] = [],
  settings: PlannerSettings = {},
): TimeBlock[] {
  const dayKey = plannerDateKey(day);
  if (!dayKey) return [];

  const { dayN, segments, window } = defaultTimeWindow(dayKey, routines);
  const noStudyDay = routines.some((routine) =>
    routine.kind === "no_study" && routine.days_of_week?.includes(dayN),
  );
  if (noStudyDay) return [];

  const minFreeSlot = settings.min_free_slot_min ?? settings.minFreeSlotMin ?? 20;
  const bedtimes = segments
    .filter((segment) => segment.kind === "sleep" && segment.start >= 17 * 60)
    .map((segment) => segment.start);
  const sleepStart = bedtimes.length > 0 ? Math.min(...bedtimes) : window.endMin;
  const dayEnd = Math.max(window.startMin, Math.min(window.endMin, sleepStart - 30));
  const occupied: TimeBlock[] = [
    ...segments,
    ...eventBlocksForDay(dayKey, busyEvents),
  ];

  if (dayEnd <= window.startMin) return [];

  return freeSlots(occupied, window.startMin, dayEnd, minFreeSlot);
}
