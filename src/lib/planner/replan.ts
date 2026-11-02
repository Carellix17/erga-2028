import { getCompletedLessonOrders } from "@/lib/courseProgress";
import type { PlanChange, PlanChangeEventValues, PlanChangeSnapshot, StudyEventRow } from "@/lib/planner/types";
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

export type ReplanSlot = Pick<
  StudyEventRow,
  | "completed_at"
  | "context_id"
  | "end_time"
  | "event_date"
  | "event_time"
  | "event_type"
  | "evaluation_id"
  | "id"
  | "is_completed"
  | "lesson_from"
  | "lesson_to"
  | "locked"
  | "move_count"
  | "notes"
  | "original_date"
  | "original_time"
  | "source"
  | "status"
  | "subject"
  | "title"
  | "version"
>;

export interface PlaceSkippedOptions {
  now: PlannerDateInput;
  deadline: PlannerDateInput;
  routines?: readonly PlannerRoutine[];
  busyEvents?: readonly PlannerBusyEvent[];
  existingSlots?: readonly ReplanSlot[];
  settings?: PlannerSettings;
}

export interface PlaceSkippedResult {
  changes: PlanChange[];
  needsUser?: boolean;
  status?: "moved" | "skipped";
  reason?: "no_space" | "locked" | "move_limit";
}

function snapshot(slot: ReplanSlot): PlanChangeSnapshot {
  return {
    completed_at: slot.completed_at,
    context_id: slot.context_id,
    end_time: slot.end_time,
    event_date: slot.event_date,
    event_time: slot.event_time,
    event_type: slot.event_type,
    evaluation_id: slot.evaluation_id,
    id: slot.id,
    is_completed: slot.is_completed,
    lesson_from: slot.lesson_from,
    lesson_to: slot.lesson_to,
    locked: slot.locked,
    move_count: slot.move_count,
    notes: slot.notes,
    original_date: slot.original_date,
    original_time: slot.original_time,
    source: slot.source,
    status: slot.status,
    subject: slot.subject,
    title: slot.title,
    version: slot.version,
  };
}

function updateChange(slot: ReplanSlot, after: PlanChangeEventValues): PlanChange {
  return {
    op: "update",
    event_id: slot.id,
    version: slot.version,
    before: snapshot(slot),
    after,
  };
}

function endMinutes(slot: ReplanSlot): number | null {
  const start = plannerTimeToMinutes(slot.event_time);
  if (start === null) return null;
  const explicitEnd = plannerTimeToMinutes(slot.end_time);
  return explicitEnd !== null && explicitEnd > start ? explicitEnd : Math.min(start + 60, 24 * 60);
}

function compareLocalDateTime(
  leftDay: string,
  leftMinutes: number,
  rightDay: string,
  rightMinutes: number,
): number {
  return leftDay.localeCompare(rightDay) || leftMinutes - rightMinutes;
}

/** Finds planned, untouched slots whose end plus the 15-minute grace has passed. */
export function detectSkipped(
  slots: readonly ReplanSlot[],
  now: PlannerDateInput,
  activeSessionSlotId: string | null,
): ReplanSlot[] {
  const nowParts = plannerDateTimeParts(now);
  if (!nowParts) return [];
  const nowMinutes = nowParts.hour * 60 + nowParts.minute + nowParts.second / 60;

  return slots
    .filter((slot) => {
      if (
        slot.id === activeSessionSlotId
        || slot.locked
        || slot.source === "manual"
        || slot.status !== "planned"
        || slot.is_completed
        || slot.completed_at
      ) return false;
      const slotDay = plannerDateKey(slot.event_date);
      const end = endMinutes(slot);
      if (!slotDay || end === null) return false;
      const graceEnd = end + 15;
      const graceDay = graceEnd >= 24 * 60 ? addPlannerDays(slotDay, 1) : slotDay;
      const graceMinute = graceEnd >= 24 * 60 ? graceEnd - 24 * 60 : graceEnd;
      return compareLocalDateTime(graceDay, graceMinute, nowParts.day, nowMinutes) <= 0;
    })
    .slice()
    .sort((a, b) =>
      plannerDateKey(a.event_date)!.localeCompare(plannerDateKey(b.event_date)!)
      || (plannerTimeToMinutes(a.event_time) ?? 0) - (plannerTimeToMinutes(b.event_time) ?? 0)
      || a.id.localeCompare(b.id),
    );
}

function schoolDay(day: string, routines: readonly PlannerRoutine[]): boolean {
  const dayN = plannerWeekday(day);
  return routines.some((routine) =>
    routine.kind === "school"
    && plannerTimeToMinutes(routine.start_time) !== null
    && plannerTimeToMinutes(routine.end_time) !== null
    && routineSegmentsForDay(routine.days_of_week ?? [], routine.start_time, routine.end_time, dayN).length > 0,
  );
}

function scheduledStudyMinutes(day: string, slots: readonly ReplanSlot[], skipId: string): number {
  return slots
    .filter((slot) => slot.id !== skipId && plannerDateKey(slot.event_date) === day)
    .filter((slot) => slot.event_type === "study" || slot.lesson_from !== null)
    .reduce((sum, slot) => {
      const start = plannerTimeToMinutes(slot.event_time);
      if (start === null) return sum;
      const end = endMinutes(slot);
      return sum + (end !== null && end > start ? end - start : 0);
    }, 0);
}

/**
 * Moves a skipped block to the first available window before its evaluation.
 * The move counter reaching three asks for user confirmation instead.
 */
export function placeSkipped(slot: ReplanSlot, options: PlaceSkippedOptions): PlaceSkippedResult {
  if (slot.locked || slot.source === "manual") {
    return { changes: [], needsUser: true, reason: "locked" };
  }
  if (slot.move_count + 1 >= 3) {
    return { changes: [], needsUser: true, reason: "move_limit" };
  }

  const nowParts = plannerDateTimeParts(options.now);
  const deadline = plannerDateKey(options.deadline);
  const start = plannerTimeToMinutes(slot.event_time);
  const end = endMinutes(slot);
  if (!nowParts || !deadline || start === null || end === null || end <= start) {
    return {
      changes: [updateChange(slot, { status: "skipped", source: "replan" })],
      status: "skipped",
      reason: "no_space",
    };
  }

  const duration = end - start;
  const routines = options.routines ?? [];
  const existingSlots = options.existingSlots ?? [];
  const busyEvents = options.busyEvents ?? [];
  const deadlineExclusive = deadline;

  for (let day = nowParts.day; day < deadlineExclusive; day = addPlannerDays(day, 1)) {
    const protectedEvents = existingSlots.filter((event) => event.id !== slot.id && plannerDateKey(event.event_date) === day);
    const windows = freeWindows(day, routines, [...busyEvents, ...protectedEvents], options.settings);
    if (day === nowParts.day) {
      const availableFrom = nowParts.hour * 60 + nowParts.minute + (nowParts.second > 0 ? 1 : 0);
      for (const window of windows) window.start = Math.max(window.start, availableFrom);
    }

    const settings = options.settings ?? {};
    const schoolLimit = settings.daily_limit_school_min ?? settings.dailyLimitSchool ?? settings.dailyLimitSchoolMin ?? 180;
    const freeLimit = settings.daily_limit_free_min ?? settings.dailyLimitFree ?? settings.dailyLimitFreeMin ?? 300;
    const dailyLimit = schoolDay(day, routines) ? schoolLimit : freeLimit;
    const used = scheduledStudyMinutes(day, existingSlots, slot.id);
    if (used + duration > dailyLimit) continue;

    const candidate = windows.find((window) => window.end - window.start >= duration);
    if (!candidate) continue;
    const newStart = candidate.start;
    const newEnd = newStart + duration;
    const after: PlanChangeEventValues = {
      event_date: day,
      event_time: plannerMinutesToTime(newStart),
      end_time: plannerMinutesToTime(newEnd),
      move_count: slot.move_count + 1,
      original_date: slot.original_date ?? slot.event_date,
      original_time: slot.original_time ?? slot.event_time,
      status: "planned",
      source: "replan",
    };
    return { changes: [updateChange(slot, after)], status: "moved" };
  }

  return {
    changes: [updateChange(slot, { status: "skipped", source: "replan" })],
    status: "skipped",
    reason: "no_space",
  };
}

function lessonTitle(from: number, to: number): string {
  return `Da Minilezione ${from + 1} a ${to + 1}`;
}

function completedSet(value: unknown): Set<number> {
  const orders = Array.isArray(value) && value.every((order) => typeof order === "number")
    ? value.filter((order): order is number => Number.isInteger(order) && order >= 0)
    : getCompletedLessonOrders(value);
  return new Set(orders);
}

/** Marks the completed prefix done and inserts an untimed continuation for the rest. */
export function splitPartial(slot: ReplanSlot, completedOrders: unknown): PlanChange[] {
  if (slot.lesson_from === null || slot.lesson_to === null) return [];
  const completed = completedSet(completedOrders);
  let completedThrough = slot.lesson_from - 1;
  while (completedThrough + 1 <= slot.lesson_to && completed.has(completedThrough + 1)) {
    completedThrough += 1;
  }
  if (completedThrough < slot.lesson_from) return [];

  const changes: PlanChange[] = [updateChange(slot, {
    lesson_to: completedThrough,
    status: "done",
    source: "replan",
  })];

  const remainingFrom = completedThrough + 1;
  if (remainingFrom <= slot.lesson_to) {
    changes.push({
      op: "insert",
      after: {
        event_date: slot.event_date,
        event_time: null,
        end_time: null,
        context_id: slot.context_id,
        evaluation_id: slot.evaluation_id,
        lesson_from: remainingFrom,
        lesson_to: slot.lesson_to,
        source: "replan",
        subject: slot.subject,
        title: lessonTitle(remainingFrom, slot.lesson_to),
      },
    });
  }

  return changes;
}
