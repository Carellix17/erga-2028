import { getCompletedLessonOrders } from "@/lib/courseProgress";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEventRow, StudyEventSource, StudyEventStatus } from "@/lib/planner/types";
import { routineSegmentsForDay } from "@/lib/weekPlanner";
import {
  addPlannerDays,
  freeWindows,
  plannerDateKey,
  plannerMinutesToTime,
  plannerTimeToMinutes,
  plannerWeekday,
  type PlannerBusyEvent,
  type PlannerDateInput,
  type PlannerRoutine,
  type PlannerSettings,
} from "@/lib/planner/freeTime";
import type { TimeBlock } from "@/lib/weekPlanner";

export interface PlannerMiniLesson {
  lesson_order: number;
  word_count?: number | null;
  exercise_count?: number | null;
}

export interface ContextLessons {
  lessons: readonly PlannerMiniLesson[];
  subject?: string | null;
  subject_type?: string | null;
}

export type LessonsByContext = Readonly<Record<string, readonly PlannerMiniLesson[] | ContextLessons>>
  | ReadonlyMap<string, readonly PlannerMiniLesson[] | ContextLessons>;
export type CompletedByContext = Readonly<Record<string, unknown>> | ReadonlyMap<string, unknown>;

export type ScheduleEvaluation = Pick<
  Evaluation,
  "id" | "date" | "is_completed" | "topic_type" | "topic_id" | "subject_id" | "title"
> & { subject?: string | null };

export type EstimateValue = number | { minutes: number };
export type EstimateFn = (
  lesson: PlannerMiniLesson,
  contextId: string,
  evaluation: ScheduleEvaluation,
) => EstimateValue;

export interface ExistingPlannerSlot extends PlannerBusyEvent {
  event_date: string;
  subject: string;
  title?: string;
  context_id?: string | null;
  evaluation_id?: string | null;
  lesson_from?: number | null;
  lesson_to?: number | null;
  event_type?: string;
  source?: StudyEventSource;
  status?: StudyEventStatus;
  locked?: boolean;
  move_count?: number;
  version?: number;
  is_completed?: boolean;
}

export interface ScheduledSlot {
  event_date: string;
  event_time: string;
  end_time: string;
  context_id: string | null;
  lesson_from: number | null;
  lesson_to: number | null;
  evaluation_id: string;
  source: "auto";
  subject: string;
  title: string;
}

export interface PlanWarning {
  evaluationId: string;
  missingMinutes: number;
}

export interface BuildPlanInput {
  today: PlannerDateInput;
  horizonDays: number;
  evaluations: readonly ScheduleEvaluation[];
  lessonsByContext: LessonsByContext;
  completedByContext: CompletedByContext;
  estimateFn: EstimateFn;
  routines?: readonly PlannerRoutine[];
  busyEvents?: readonly PlannerBusyEvent[];
  existingSlots?: readonly (StudyEventRow | ExistingPlannerSlot)[];
  settings?: PlannerSettings;
}

export interface BuildPlanResult {
  slots: ScheduledSlot[];
  warnings: PlanWarning[];
}

export type TimelineBlockKind = "study" | "pause";

export interface TimelineSegment {
  kind: TimelineBlockKind;
  start: number;
  end: number;
  duration: number;
  lesson_from?: number;
  lesson_to?: number;
}

interface EstimatedLesson {
  lesson: PlannerMiniLesson;
  minutes: number;
}

interface EffectiveSettings {
  lessonsPerBlock: number;
  shortBreak: number;
  mediumBreak: number;
  longBreak: number;
  longBreakEvery: number;
  longBreakAfter: number;
  maxBlock: number;
  dailySchoolLimit: number;
  dailyFreeLimit: number;
}

function setting(settings: PlannerSettings, keys: readonly (keyof PlannerSettings)[], fallback: number): number {
  const value = keys.map((key) => settings[key]).find((candidate) => candidate !== undefined);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function effectiveSettings(settings: PlannerSettings = {}): EffectiveSettings {
  return {
    lessonsPerBlock: Math.max(1, Math.floor(setting(settings, ["lessons_per_block", "lessonsPerBlock"], 3))),
    shortBreak: Math.max(0, setting(settings, ["short_break_min", "shortBreak", "shortBreakMin"], 5)),
    mediumBreak: Math.max(0, setting(settings, ["medium_break_min", "mediumBreak", "mediumBreakMin"], 10)),
    longBreak: Math.max(0, setting(settings, ["long_break_min", "longBreak", "longBreakMin"], 20)),
    longBreakEvery: Math.max(1, Math.floor(setting(settings, ["long_break_every", "longBreakEvery"], 3))),
    longBreakAfter: Math.max(0, setting(settings, ["long_break_after_min", "longBreakAfterMin"], 90)),
    maxBlock: Math.max(1, setting(settings, ["max_block_min", "maxBlock", "maxBlockMin"], 50)),
    dailySchoolLimit: Math.max(0, setting(settings, ["daily_limit_school_min", "dailyLimitSchool", "dailyLimitSchoolMin"], 180)),
    dailyFreeLimit: Math.max(0, setting(settings, ["daily_limit_free_min", "dailyLimitFree", "dailyLimitFreeMin"], 300)),
  };
}

function valueForKey<T>(source: Readonly<Record<string, T>> | ReadonlyMap<string, T>, key: string): T | undefined {
  if (source instanceof Map) return source.get(key);
  return source[key];
}

function contextLessons(value: readonly PlannerMiniLesson[] | ContextLessons | undefined): readonly PlannerMiniLesson[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "lessons" in value && Array.isArray(value.lessons)) return value.lessons;
  return [];
}

function contextSubject(value: readonly PlannerMiniLesson[] | ContextLessons | undefined): string | null {
  if (!value || Array.isArray(value) || !("subject" in value)) return null;
  const subject = value.subject;
  return typeof subject === "string" && subject.trim() ? subject.trim() : null;
}

function normalizedCompletedOrders(value: unknown): Set<number> {
  const orders = Array.isArray(value) && value.every((entry) => typeof entry === "number")
    ? value.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0)
    : getCompletedLessonOrders(value);
  return new Set(orders);
}

function estimateMinutes(
  estimateFn: EstimateFn,
  lesson: PlannerMiniLesson,
  contextId: string,
  evaluation: ScheduleEvaluation,
): number {
  const result = estimateFn(lesson, contextId, evaluation);
  const minutes = typeof result === "number" ? result : result.minutes;
  return Number.isFinite(minutes) && minutes > 0 ? Math.ceil(minutes) : 0;
}

function dayDistance(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function lessonTitle(from: number, to: number): string {
  return `Da Minilezione ${from + 1} a ${to + 1}`;
}

function makeStudyBlocks(lessons: readonly EstimatedLesson[], settings: EffectiveSettings): EstimatedLesson[][] {
  const blocks: EstimatedLesson[][] = [];
  let current: EstimatedLesson[] = [];
  let currentMinutes = 0;

  for (const lesson of lessons) {
    if (lesson.minutes <= 0 || lesson.minutes > settings.maxBlock) break;
    const reachesCountLimit = current.length >= settings.lessonsPerBlock;
    const reachesTimeLimit = currentMinutes + lesson.minutes > settings.maxBlock;
    if (current.length > 0 && (reachesCountLimit || reachesTimeLimit)) {
      blocks.push(current);
      current = [];
      currentMinutes = 0;
    }
    current.push(lesson);
    currentMinutes += lesson.minutes;
  }

  if (current.length > 0) blocks.push(current);
  return blocks;
}

function pauseAfterBlock(
  blockMinutes: number,
  blocksSinceLong: number,
  studySinceLong: number,
  settings: EffectiveSettings,
): { minutes: number; isLong: boolean } {
  if (blocksSinceLong >= settings.longBreakEvery || studySinceLong >= settings.longBreakAfter) {
    return { minutes: settings.longBreak, isLong: true };
  }
  return {
    minutes: blockMinutes < 30 ? settings.shortBreak : settings.mediumBreak,
    isLong: false,
  };
}

function buildTimeline(
  lessons: readonly EstimatedLesson[],
  settings: EffectiveSettings,
  start = 0,
): TimelineSegment[] {
  const blocks = makeStudyBlocks(lessons, settings);
  const result: TimelineSegment[] = [];
  let cursor = start;
  let blocksSinceLong = 0;
  let studySinceLong = 0;

  blocks.forEach((block, index) => {
    const blockMinutes = block.reduce((sum, lesson) => sum + lesson.minutes, 0);
    const firstOrder = block[0].lesson.lesson_order;
    const lastOrder = block[block.length - 1].lesson.lesson_order;
    result.push({
      kind: "study",
      start: cursor,
      end: cursor + blockMinutes,
      duration: blockMinutes,
      lesson_from: firstOrder,
      lesson_to: lastOrder,
    });
    cursor += blockMinutes;
    blocksSinceLong += 1;
    studySinceLong += blockMinutes;

    if (index < blocks.length - 1) {
      const pause = pauseAfterBlock(blockMinutes, blocksSinceLong, studySinceLong, settings);
      if (pause.minutes > 0) {
        result.push({ kind: "pause", start: cursor, end: cursor + pause.minutes, duration: pause.minutes });
        cursor += pause.minutes;
      }
      if (pause.isLong) {
        blocksSinceLong = 0;
        studySinceLong = 0;
      }
    }
  });

  return result;
}

/**
 * Computes display-only study and pause segments for one scheduled slot.
 * `estimates` is in lesson order, or can pair lesson_order with minutes.
 */
export function pauses(
  slot: Pick<ScheduledSlot, "event_time" | "lesson_from" | "lesson_to">,
  estimates: readonly (number | { lesson_order: number; minutes: number })[],
  settings: PlannerSettings = {},
): TimelineSegment[] {
  const effective = effectiveSettings(settings);
  const from = slot.lesson_from ?? 0;
  const ordered = estimates.map((estimate, index) => typeof estimate === "number"
    ? { lesson: { lesson_order: from + index, word_count: null, exercise_count: null }, minutes: Math.ceil(estimate) }
    : { lesson: { lesson_order: estimate.lesson_order, word_count: null, exercise_count: null }, minutes: Math.ceil(estimate.minutes) });
  const inRange = (slot.lesson_to === null
    ? ordered
    : ordered.filter(({ lesson }) => lesson.lesson_order >= from && lesson.lesson_order <= slot.lesson_to!))
    .sort((a, b) => a.lesson.lesson_order - b.lesson.lesson_order);
  const start = plannerTimeToMinutes(slot.event_time) ?? 0;
  return buildTimeline(inRange, effective, start);
}

function isProtectedSlot(slot: StudyEventRow | ExistingPlannerSlot): boolean {
  return slot.source === "manual"
    || slot.locked === true
    || slot.status === "done"
    || slot.is_completed === true;
}

function slotDuration(slot: StudyEventRow | ExistingPlannerSlot): number {
  const start = plannerTimeToMinutes(slot.event_time);
  if (start === null) return 0;
  const end = plannerTimeToMinutes(slot.end_time) ?? Math.min(start + 60, 24 * 60);
  return end > start ? end - start : 0;
}

function evaluationPlans(input: BuildPlanInput, protectedSlots: readonly (StudyEventRow | ExistingPlannerSlot)[]) {
  const evaluations = input.evaluations
    .map((evaluation) => ({ evaluation, dueDay: plannerDateKey(evaluation.date) }))
    .filter((entry): entry is { evaluation: ScheduleEvaluation; dueDay: string } =>
      !!entry.dueDay && !entry.evaluation.is_completed,
    )
    .sort((a, b) => a.dueDay.localeCompare(b.dueDay) || a.evaluation.id.localeCompare(b.evaluation.id));

  const reservedByContext = new Map<string, Set<number>>();
  const evaluationById = new Map(evaluations.map(({ evaluation }) => [evaluation.id, evaluation]));
  for (const slot of protectedSlots) {
    const contextId = slot.context_id
      ?? (slot.evaluation_id ? evaluationById.get(slot.evaluation_id)?.topic_id ?? null : null);
    if (!contextId || slot.lesson_from === null || slot.lesson_from === undefined || slot.lesson_to === null || slot.lesson_to === undefined) continue;
    const orders = reservedByContext.get(contextId) ?? new Set<number>();
    for (let order = slot.lesson_from; order <= slot.lesson_to; order += 1) orders.add(order);
    reservedByContext.set(contextId, orders);
  }

  const completedByContext = new Map<string, Set<number>>();
  for (const [contextId, raw] of input.completedByContext instanceof Map
    ? input.completedByContext.entries()
    : Object.entries(input.completedByContext)) {
    completedByContext.set(contextId, normalizedCompletedOrders(raw));
  }

  return evaluations.map(({ evaluation, dueDay }) => {
    const contextId = evaluation.topic_type === "linked" ? evaluation.topic_id : null;
    const rawContext = contextId ? valueForKey(input.lessonsByContext, contextId) : undefined;
    const completed = contextId ? completedByContext.get(contextId) ?? new Set<number>() : new Set<number>();
    const reserved = contextId ? reservedByContext.get(contextId) ?? new Set<number>() : new Set<number>();
    const lessons = contextId
      ? contextLessons(rawContext)
        .filter((lesson) => Number.isInteger(lesson.lesson_order) && lesson.lesson_order >= 0)
        .slice()
        .sort((a, b) => a.lesson_order - b.lesson_order)
        .filter((lesson) => !completed.has(lesson.lesson_order) && !reserved.has(lesson.lesson_order))
        .map((lesson) => ({ lesson, minutes: estimateMinutes(input.estimateFn, lesson, contextId, evaluation) }))
      : [];
    const subject = evaluation.subject?.trim()
      || contextSubject(rawContext)
      || evaluation.subject_id
      || (evaluation.topic_type === "free" ? evaluation.title : null)
      || "Materia";

    return { evaluation, dueDay, contextId, subject, lessons };
  });
}

function schoolDay(day: string, routines: readonly PlannerRoutine[]): boolean {
  const dayN = plannerWeekday(day);
  return routines.some((routine) => {
    if (routine.kind !== "school") return false;
    if (plannerTimeToMinutes(routine.start_time) === null || plannerTimeToMinutes(routine.end_time) === null) return false;
    return routineSegmentsForDay(routine.days_of_week ?? [], routine.start_time, routine.end_time, dayN).length > 0;
  });
}

function protectedStudyMinutesForDay(day: string, slots: readonly (StudyEventRow | ExistingPlannerSlot)[]): number {
  return slots
    .filter((slot) => isProtectedSlot(slot) && plannerDateKey(slot.event_date) === day)
    .filter((slot) => slot.event_type === "study" || (slot.lesson_from !== null && slot.lesson_from !== undefined))
    .reduce((sum, slot) => sum + slotDuration(slot), 0);
}

function longestAffordablePrefix(
  lessons: readonly EstimatedLesson[],
  window: TimeBlock,
  dailyBudget: number,
  settings: EffectiveSettings,
): { count: number; timeline: TimelineSegment[]; studyMinutes: number } {
  let bestCount = 0;
  let bestTimeline: TimelineSegment[] = [];
  let bestStudyMinutes = 0;

  for (let count = 1; count <= lessons.length; count += 1) {
    const prefix = lessons.slice(0, count);
    const studyMinutes = prefix.reduce((sum, lesson) => sum + lesson.minutes, 0);
    if (studyMinutes > dailyBudget) break;
    const timeline = buildTimeline(prefix, settings, window.start);
    const end = timeline[timeline.length - 1]?.end ?? window.start;
    if (end - window.start > window.end - window.start) break;
    bestCount = count;
    bestTimeline = timeline;
    bestStudyMinutes = studyMinutes;
  }

  return { count: bestCount, timeline: bestTimeline, studyMinutes: bestStudyMinutes };
}

function quotaPrefix(lessons: readonly EstimatedLesson[], targetMinutes: number, dailyBudget: number, maxBlock: number): EstimatedLesson[] {
  const target = Math.min(targetMinutes, dailyBudget);
  const selected: EstimatedLesson[] = [];
  let total = 0;
  for (const lesson of lessons) {
    if (lesson.minutes <= 0 || lesson.minutes > maxBlock) break;
    if (total + lesson.minutes > target) break;
    selected.push(lesson);
    total += lesson.minutes;
  }
  return selected;
}

function allocateLessons(
  day: string,
  plan: ReturnType<typeof evaluationPlans>[number],
  selected: readonly EstimatedLesson[],
  windows: TimeBlock[],
  dailyBudget: number,
  settings: EffectiveSettings,
  scheduledByContext: Map<string, Set<number>>,
  output: ScheduledSlot[],
): number {
  if (!plan.contextId) return 0;
  let scheduledStudy = 0;
  let remaining = [...selected];
  const scheduledOrders = scheduledByContext.get(plan.contextId) ?? new Set<number>();

  for (const window of windows) {
    while (remaining.length > 0 && dailyBudget - scheduledStudy > 0) {
      const fit = longestAffordablePrefix(remaining, window, dailyBudget - scheduledStudy, settings);
      if (fit.count === 0) break;

      const timelineEnd = fit.timeline[fit.timeline.length - 1]?.end ?? window.start;
      const first = remaining[0].lesson.lesson_order;
      const last = remaining[fit.count - 1].lesson.lesson_order;
      output.push({
        event_date: day,
        event_time: plannerMinutesToTime(window.start),
        end_time: plannerMinutesToTime(timelineEnd),
        context_id: plan.contextId,
        lesson_from: first,
        lesson_to: last,
        evaluation_id: plan.evaluation.id,
        source: "auto",
        subject: plan.subject,
        title: lessonTitle(first, last),
      });
      window.start = timelineEnd;
      for (const lesson of remaining.slice(0, fit.count)) scheduledOrders.add(lesson.lesson.lesson_order);
      remaining = remaining.slice(fit.count);
      scheduledStudy += fit.studyMinutes;
    }
  }

  scheduledByContext.set(plan.contextId, scheduledOrders);
  return scheduledStudy;
}

function placeReview(
  day: string,
  plan: ReturnType<typeof evaluationPlans>[number],
  windows: TimeBlock[],
  dailyBudget: number,
): ScheduledSlot | null {
  if (dailyBudget < 45) return null;
  const window = windows.find((candidate) => candidate.end - candidate.start >= 45);
  if (!window) return null;
  const start = window.start;
  const end = start + 45;
  window.start = end;
  return {
    event_date: day,
    event_time: plannerMinutesToTime(start),
    end_time: plannerMinutesToTime(end),
    context_id: null,
    lesson_from: null,
    lesson_to: null,
    evaluation_id: plan.evaluation.id,
    source: "auto",
    subject: plan.subject,
    title: `Ripasso: ${plan.evaluation.title}`,
  };
}

/** Creates a deterministic EDF plan for the requested calendar horizon. */
export function buildPlan(input: BuildPlanInput): BuildPlanResult {
  const today = plannerDateKey(input.today);
  if (!today) return { slots: [], warnings: [] };
  const horizon = Math.min(30, Math.max(0, Math.floor(input.horizonDays)));
  const routines = input.routines ?? [];
  const busyEvents = input.busyEvents ?? [];
  const settings = effectiveSettings(input.settings);
  const protectedSlots = (input.existingSlots ?? []).filter(isProtectedSlot);
  const plans = evaluationPlans(input, protectedSlots)
    .filter((plan) => plan.dueDay > today)
    .sort((a, b) => a.dueDay.localeCompare(b.dueDay) || a.evaluation.id.localeCompare(b.evaluation.id));

  const scheduledByContext = new Map<string, Set<number>>();
  const slots: ScheduledSlot[] = [];
  const placedReviews = new Map<string, number>();
  const desiredReviews = new Map(plans
    .filter((plan) => plan.evaluation.topic_type === "free")
    .map((plan) => [plan.evaluation.id, Math.min(3, Math.max(0, dayDistance(today, plan.dueDay)))]));

  for (let offset = 0; offset < horizon; offset += 1) {
    const day = addPlannerDays(today, offset);
    const protectedBusy = protectedSlots.filter((slot) => plannerDateKey(slot.event_date) === day);
    const blockers = [...busyEvents, ...protectedBusy];
    const windows = freeWindows(day, routines, blockers, input.settings);
    const dailyLimit = schoolDay(day, routines) ? settings.dailySchoolLimit : settings.dailyFreeLimit;
    let usedStudyMinutes = protectedStudyMinutesForDay(day, protectedSlots);

    for (const plan of plans) {
      if (plan.dueDay <= day) continue;
      const dailyBudget = Math.max(0, dailyLimit - usedStudyMinutes);
      if (dailyBudget <= 0 || windows.every((window) => window.end <= window.start)) continue;

      if (plan.evaluation.topic_type === "free") {
        const placed = placedReviews.get(plan.evaluation.id) ?? 0;
        if (placed >= (desiredReviews.get(plan.evaluation.id) ?? 0)) continue;
        const review = placeReview(day, plan, windows, dailyBudget);
        if (review) {
          slots.push(review);
          placedReviews.set(plan.evaluation.id, placed + 1);
          usedStudyMinutes += 45;
        }
        continue;
      }

      if (!plan.contextId) continue;
      const alreadyScheduled = scheduledByContext.get(plan.contextId) ?? new Set<number>();
      const remaining = plan.lessons.filter(({ lesson }) => !alreadyScheduled.has(lesson.lesson_order));
      if (remaining.length === 0) continue;
      const remainingMinutes = remaining.reduce((sum, lesson) => sum + lesson.minutes, 0);
      const daysUseful = dayDistance(day, plan.dueDay);
      if (daysUseful <= 0) continue;
      const targetMinutes = remainingMinutes / daysUseful + 10;
      const selected = quotaPrefix(remaining, targetMinutes, dailyBudget, settings.maxBlock);
      if (selected.length === 0) continue;

      usedStudyMinutes += allocateLessons(
        day,
        plan,
        selected,
        windows,
        dailyBudget,
        settings,
        scheduledByContext,
        slots,
      );
    }
  }

  const warnings = plans.flatMap((plan) => {
    if (plan.evaluation.topic_type === "free") {
      const required = desiredReviews.get(plan.evaluation.id) ?? 0;
      const placed = placedReviews.get(plan.evaluation.id) ?? 0;
      const missingMinutes = Math.max(0, required - placed) * 45;
      return missingMinutes > 0 ? [{ evaluationId: plan.evaluation.id, missingMinutes }] : [];
    }
    if (!plan.contextId) return [];
    const scheduled = scheduledByContext.get(plan.contextId) ?? new Set<number>();
    const missingMinutes = plan.lessons
      .filter(({ lesson }) => !scheduled.has(lesson.lesson_order))
      .reduce((sum, lesson) => sum + lesson.minutes, 0);
    return missingMinutes > 0 ? [{ evaluationId: plan.evaluation.id, missingMinutes }] : [];
  });

  return {
    slots: slots.sort((a, b) =>
      a.event_date.localeCompare(b.event_date)
      || a.event_time.localeCompare(b.event_time)
      || a.evaluation_id.localeCompare(b.evaluation_id),
    ),
    warnings,
  };
}
