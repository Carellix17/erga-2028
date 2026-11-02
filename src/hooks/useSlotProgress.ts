import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { lessonsKeys, type LessonsListData } from "@/hooks/useLessons";
import {
  studyEventsKeys,
  useApplyPlanChanges,
  useStudyEventsQuery,
  type StudyEvent,
} from "@/hooks/useStudyEvents";
import { addPlannerDays, plannerDateKey, plannerDateTimeParts, plannerTimeToMinutes } from "@/lib/planner/freeTime";
import type { PlanChange, PlanChangeSnapshot, StudyEventStatus } from "@/lib/planner/types";

export interface SlotProgressInput {
  contextId: string | null | undefined;
  /** Zero-based lesson_order, not the lesson's display number. */
  order: number;
}

function snapshotFor(event: StudyEvent): PlanChangeSnapshot {
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

function dayOrdinal(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}

function isInProgress(event: StudyEvent, now: Date): boolean {
  const day = plannerDateKey(event.event_date);
  const startMinute = plannerTimeToMinutes(event.event_time);
  const clock = plannerDateTimeParts(now);
  if (!day || startMinute === null || !clock) return false;

  const start = dayOrdinal(day) * 1440 + startMinute;
  const explicitEnd = plannerTimeToMinutes(event.end_time);
  const end = explicitEnd === null
    ? start + 60
    : dayOrdinal(explicitEnd <= startMinute ? addPlannerDays(day, 1) : day) * 1440 + explicitEnd;
  const current = dayOrdinal(clock.day) * 1440 + clock.hour * 60 + clock.minute + clock.second / 60;
  return start <= current && current < end;
}

function isEligibleTodayOrInProgress(event: StudyEvent, today: string, now: Date): boolean {
  const eventDay = plannerDateKey(event.event_date);
  return eventDay === today || isInProgress(event, now);
}

function statusForProgress(
  event: StudyEvent,
  completedOrders: ReadonlySet<number>,
): StudyEventStatus {
  const from = event.lesson_from;
  const to = event.lesson_to;
  if (from == null || to == null || to < from) return "partial";
  for (let order = from; order <= to; order += 1) {
    if (!completedOrders.has(order)) return "partial";
  }
  return "done";
}

function chooseSlot(
  events: readonly StudyEvent[],
  contextId: string,
  order: number,
  today: string,
  now: Date,
): StudyEvent | undefined {
  const candidates = events.filter((event) =>
    event.event_type === "study"
    && event.context_id === contextId
    && event.lesson_from != null
    && event.lesson_to != null
    && event.lesson_from <= order
    && order <= event.lesson_to
    && event.status !== "done"
    && event.status !== "skipped"
    && event.is_completed !== true
    && isEligibleTodayOrInProgress(event, today, now),
  );

  return candidates.sort((left, right) => {
    const leftInProgress = isInProgress(left, now) ? 1 : 0;
    const rightInProgress = isInProgress(right, now) ? 1 : 0;
    if (leftInProgress !== rightInProgress) return rightInProgress - leftInProgress;
    const leftTime = plannerTimeToMinutes(left.event_time) ?? Number.MAX_SAFE_INTEGER;
    const rightTime = plannerTimeToMinutes(right.event_time) ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || left.id.localeCompare(right.id);
  })[0];
}

/**
 * Best-effort bridge from a saved Studio completion to today's matching study slot.
 * The lesson order is always zero-based, matching lesson_from/lesson_to.
 */
export function useSlotProgress() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const studyEventsQuery = useStudyEventsQuery(true);
  const applyPlanChanges = useApplyPlanChanges();

  return useMutation<void, Error, SlotProgressInput>({
    mutationFn: async ({ contextId, order }) => {
      if (!currentUser || !contextId || !Number.isInteger(order) || order < 0) return;

      const eventQueryKey = studyEventsKeys.all(currentUser);
      let events = queryClient.getQueryData<StudyEvent[]>(eventQueryKey) ?? studyEventsQuery.data;
      if (!events) {
        const refreshed = await studyEventsQuery.refetch();
        events = refreshed.data ?? [];
      }

      const now = new Date();
      const today = plannerDateKey(now);
      if (!today) return;
      const slot = chooseSlot(events, contextId, order, today, now);
      if (!slot) return;

      const lessons = queryClient.getQueryData<LessonsListData>(lessonsKeys.list(currentUser, contextId));
      const completedOrders = new Set(
        (lessons?.completed ?? []).filter((completedOrder) => Number.isInteger(completedOrder) && completedOrder >= 0),
      );
      completedOrders.add(order);

      const change: PlanChange = {
        op: "update",
        event_id: slot.id,
        version: slot.version ?? 0,
        before: snapshotFor(slot),
        after: { status: statusForProgress(slot, completedOrders) },
      };
      await applyPlanChanges.mutateAsync({ reason: "manual", changes: [change] });
    },
    // Studio completion must never depend on this secondary plan update.
    onError: () => undefined,
  });
}
