import {
  addPlannerDays,
  freeWindows,
  plannerDateKey,
  plannerDateTimeParts,
  plannerMinutesToTime,
  plannerTimeToMinutes,
  plannerWeekday,
  type PlannerBusyEvent,
  type PlannerDateInput,
  type PlannerRoutine,
  type PlannerSettings,
} from "@/lib/planner/freeTime";
import { routineSegmentsForDay } from "@/lib/weekPlanner";

export interface MoveConflictEvent extends PlannerBusyEvent {
  id: string;
  event_date: string;
  label?: string | null;
}

export interface MoveConflictSlot {
  id: string;
  eventTime: string;
  endTime: string;
  /** Position at the time the move interaction began; "keep" restores this without saving. */
  original?: {
    date: string;
    eventTime: string;
    endTime: string;
  };
  routines?: readonly PlannerRoutine[];
  events?: readonly MoveConflictEvent[];
  settings?: PlannerSettings;
}

export interface MoveSlotTarget {
  date: string;
  time: string;
}

export interface MoveSlotSaveTarget extends MoveSlotTarget {
  endTime: string;
}

export interface MoveConflictBlock {
  kind: "routine" | "event";
  label: string;
  startTime: string;
  endTime: string;
}

export type MoveConflictProposal =
  | { kind: "after"; date: string; time: string; endTime: string }
  | { kind: "shorten"; date: string; time: string; endTime: string }
  | { kind: "keep"; date: string; time: string; endTime: string };

export interface FindConflictsResult {
  valid: boolean;
  hasConflict: boolean;
  conflicts: MoveConflictBlock[];
  proposals: MoveConflictProposal[];
}

interface ConflictBlockWithMinutes extends MoveConflictBlock {
  start: number;
  end: number;
}

function overlaps(start: number, end: number, blockStart: number, blockEnd: number) {
  return start < blockEnd && end > blockStart;
}

function ceilToStep(minutes: number, step: number) {
  return Math.ceil(minutes / step) * step;
}

function eventBlocksForDay(day: string, events: readonly MoveConflictEvent[]): ConflictBlockWithMinutes[] {
  const previousDay = addPlannerDays(day, -1);
  return events.flatMap((event) => {
    const eventDay = plannerDateKey(event.event_date);
    const start = plannerTimeToMinutes(event.event_time);
    if (!eventDay || start === null) return [];

    const explicitEnd = plannerTimeToMinutes(event.end_time);
    const end = explicitEnd ?? Math.min(start + 60, 24 * 60);
    const label = event.label?.trim() || event.subject?.trim() || "Impegno";
    const blocks: ConflictBlockWithMinutes[] = [];

    if (eventDay === day) {
      const blockEnd = explicitEnd !== null && explicitEnd < start ? 24 * 60 : end;
      if (blockEnd > start) {
        blocks.push({
          kind: "event",
          label,
          startTime: plannerMinutesToTime(start),
          endTime: plannerMinutesToTime(blockEnd),
          start,
          end: blockEnd,
        });
      }
    }

    if (eventDay === previousDay && explicitEnd !== null && explicitEnd < start && explicitEnd > 0) {
      blocks.push({
        kind: "event",
        label,
        startTime: "00:00",
        endTime: plannerMinutesToTime(explicitEnd),
        start: 0,
        end: explicitEnd,
      });
    }

    return blocks;
  });
}

function routineBlocksForDay(day: string, routines: readonly PlannerRoutine[]): ConflictBlockWithMinutes[] {
  const dayN = plannerWeekday(day);
  return routines.flatMap((routine) => routineSegmentsForDay(
    routine.days_of_week ?? [],
    routine.start_time,
    routine.end_time,
    dayN,
  ).filter((segment) => segment.end > segment.start).map((segment) => ({
    kind: "routine" as const,
    label: routine.label?.trim() || routine.kind,
    startTime: plannerMinutesToTime(segment.start),
    endTime: plannerMinutesToTime(segment.end),
    start: segment.start,
    end: segment.end,
  })));
}

/**
 * Checks a proposed position against the day's routines, occupied events and
 * other plan slots. It has no side effects and never reads the system clock.
 */
export function findConflicts(slot: MoveConflictSlot, day: string): FindConflictsResult {
  const dayKey = plannerDateKey(day);
  const start = plannerTimeToMinutes(slot.eventTime);
  const end = plannerTimeToMinutes(slot.endTime);
  if (!dayKey || start === null || end === null || end <= start) {
    return { valid: false, hasConflict: false, conflicts: [], proposals: [] };
  }

  const routines = slot.routines ?? [];
  const events = (slot.events ?? []).filter((event) => event.id !== slot.id);
  const blocks = [
    ...routineBlocksForDay(dayKey, routines),
    ...eventBlocksForDay(dayKey, events),
  ];
  const conflictingBlocks = blocks
    .filter((block) => overlaps(start, end, block.start, block.end))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  if (conflictingBlocks.length === 0) {
    return { valid: true, hasConflict: false, conflicts: [], proposals: [] };
  }

  const duration = end - start;
  const latestConflictEnd = Math.max(...conflictingBlocks.map((block) => block.end));
  const settings: PlannerSettings = {
    ...slot.settings,
    min_free_slot_min: Math.max(1, Math.min(duration, slot.settings?.min_free_slot_min ?? 20)),
  };
  const free = freeWindows(dayKey, routines, events, settings);
  const afterWindow = free.find((window) => {
    const afterStart = ceilToStep(Math.max(window.start, latestConflictEnd), 5);
    return afterStart + duration <= window.end;
  });
  const proposals: MoveConflictProposal[] = [];

  if (afterWindow) {
    const time = plannerMinutesToTime(ceilToStep(Math.max(afterWindow.start, latestConflictEnd), 5));
    const afterEnd = plannerTimeToMinutes(time)! + duration;
    proposals.push({ kind: "after", date: dayKey, time, endTime: plannerMinutesToTime(afterEnd) });
  }

  const blockCoveringStart = conflictingBlocks.some((block) => block.start <= start && block.end > start);
  const nextConflictStart = conflictingBlocks
    .filter((block) => block.start > start)
    .reduce<number | null>((earliest, block) => Math.min(earliest ?? block.start, block.start), null);
  if (!blockCoveringStart && nextConflictStart !== null && nextConflictStart - start >= 10) {
    proposals.push({
      kind: "shorten",
      date: dayKey,
      time: slot.eventTime,
      endTime: plannerMinutesToTime(nextConflictStart),
    });
  }

  const original = slot.original ?? { date: dayKey, eventTime: slot.eventTime, endTime: slot.endTime };
  proposals.push({
    kind: "keep",
    date: plannerDateKey(original.date) ?? dayKey,
    time: original.eventTime,
    endTime: original.endTime,
  });

  return {
    valid: true,
    hasConflict: true,
    conflicts: conflictingBlocks.map(({ kind, label, startTime, endTime }) => ({ kind, label, startTime, endTime })),
    proposals,
  };
}

export interface FindFirstFreeTimeOptions {
  fromDay: string;
  fromTime?: string;
  durationMinutes: number;
  now: PlannerDateInput;
  routines?: readonly PlannerRoutine[];
  events?: readonly MoveConflictEvent[];
  excludeEventId?: string;
  settings?: PlannerSettings;
  horizonDays?: number;
}

/** Finds the first free, non-nighttime 5-minute-aligned position in the future. */
export function findFirstFreeTime(options: FindFirstFreeTimeOptions): MoveSlotTarget | null {
  const today = plannerDateKey(options.now);
  const nowParts = plannerDateTimeParts(options.now);
  const requestedDay = plannerDateKey(options.fromDay);
  if (!today || !nowParts || !requestedDay || !Number.isFinite(options.durationMinutes) || options.durationMinutes <= 0) {
    return null;
  }

  const firstDay = requestedDay < today ? today : requestedDay;
  const duration = Math.ceil(options.durationMinutes);
  const events = (options.events ?? []).filter((event) => event.id !== options.excludeEventId);
  const minFree = Math.max(1, Math.min(duration, options.settings?.min_free_slot_min ?? 20));
  const settings: PlannerSettings = { ...options.settings, min_free_slot_min: minFree };
  const horizonDays = Math.max(1, Math.min(60, Math.trunc(options.horizonDays ?? 30)));

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addPlannerDays(firstDay, offset);
    const windows = freeWindows(day, options.routines ?? [], events, settings);
    let notBefore = 0;
    if (day === today) notBefore = nowParts.hour * 60 + nowParts.minute + (nowParts.second > 0 ? 1 : 0);
    if (day === firstDay && options.fromDay === firstDay) {
      const fromTime = plannerTimeToMinutes(options.fromTime);
      if (fromTime !== null) notBefore = Math.max(notBefore, fromTime);
    }

    for (const window of windows) {
      const start = ceilToStep(Math.max(window.start, notBefore), 5);
      const end = start + duration;
      if (start < 24 * 60 && end <= window.end) {
        return { date: day, time: plannerMinutesToTime(start) };
      }
    }
  }
  return null;
}
