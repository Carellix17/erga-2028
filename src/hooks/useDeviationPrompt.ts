import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOptionalFocus } from "@/contexts/FocusContext";
import type { PlannerData } from "@/hooks/usePlannerData";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import { buildPlan, type ExistingPlannerSlot, type PlanWarning, type ScheduleEvaluation } from "@/lib/planner/schedule";
import {
  plannerDateKey,
  plannerDateTimeParts,
  plannerTimeToMinutes,
} from "@/lib/planner/freeTime";
import type {
  PlanChange,
  PlanChangeEventValues,
  PlanChangeReason,
  PlanChangeSnapshot,
} from "@/lib/planner/types";
import {
  acknowledgeDeviationPromptSignal,
  getPendingDeviationSignals,
  markDeviationPromptSignalShown,
  subscribeToDeviationSignals,
  type DeviationPromptSignal,
  type DeviationReason,
} from "@/lib/focus/deviationPrompt";
import { supabase } from "@/integrations/supabase/client";

const DISMISSAL_STORAGE_KEY = "erga:replan-dismissed:v1";
const DISMISSAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface DeviationPromptView {
  signalId: string;
  reason: DeviationReason;
  planReason: "overrun" | "faster";
  subject: string;
  plannedMin: number;
  actualMin: number;
  rows: number;
  dayKey: string;
}

export interface DeviationPlanProposal {
  signalId: string;
  reason: "overrun" | "faster";
  changes: PlanChange[];
  warnings: PlanWarning[];
  evaluations: readonly Pick<ScheduleEvaluation, "id" | "title" | "subject">[];
}

interface UseDeviationPromptOptions {
  plannerData: PlannerData | undefined;
  events: readonly StudyEvent[];
  blocked?: boolean;
  onPreview: (proposal: DeviationPlanProposal) => void;
}

interface DismissalRecord {
  key: string;
  reason: DeviationReason;
  timestamp: number;
}

type VersionedStudyEvent = StudyEvent & { version: number };

function planReason(reason: DeviationReason): "overrun" | "faster" {
  return reason === "slower" ? "overrun" : "faster";
}

function normalizeSubject(subject: string | null | undefined): string {
  return (subject ?? "").trim().toLocaleLowerCase();
}

function dayTimeIsFuture(day: string | null | undefined, time: string | null | undefined, now: Date): boolean {
  const slotDay = day ? plannerDateKey(day) : null;
  const today = plannerDateKey(now);
  if (!slotDay || !today) return false;
  if (slotDay > today) return true;
  if (slotDay < today) return false;

  const slotMinute = plannerTimeToMinutes(time);
  const current = plannerDateTimeParts(now);
  if (slotMinute === null || !current) return false;
  return slotMinute > current.hour * 60 + current.minute;
}

function isEditableFutureStudy(event: StudyEvent, now: Date): event is VersionedStudyEvent {
  return event.event_type === "study"
    && event.source !== undefined
    && event.source !== "manual"
    && event.locked !== true
    && event.status !== "done"
    && event.is_completed !== true
    && Number.isInteger(event.version)
    && (event.version as number) >= 0
    && dayTimeIsFuture(event.event_date, event.event_time, now);
}

function belongsToEvaluations(event: StudyEvent, evaluations: readonly ScheduleEvaluation[]): boolean {
  if (event.evaluation_id) return evaluations.some((evaluation) => evaluation.id === event.evaluation_id);
  if (event.context_id) return evaluations.some((evaluation) => evaluation.topic_id === event.context_id);
  return evaluations.some((evaluation) => normalizeSubject(evaluation.subject) === normalizeSubject(event.subject));
}

function matchingEvaluations(
  data: PlannerData,
  signal: DeviationPromptSignal,
  today: string,
): ScheduleEvaluation[] {
  const future = data.evaluations.filter((evaluation) => {
    const dueDay = plannerDateKey(evaluation.date);
    return !evaluation.is_completed && !!dueDay && dueDay > today;
  });
  if (signal.evaluationId) {
    const exact = future.filter((evaluation) => evaluation.id === signal.evaluationId);
    if (exact.length) return exact;
  }
  if (signal.contextId) {
    const contextual = future.filter((evaluation) => evaluation.topic_id === signal.contextId);
    if (contextual.length) return contextual;
  }
  return future.filter((evaluation) => normalizeSubject(evaluation.subject) === normalizeSubject(signal.subject));
}

function toExistingPlannerSlot(event: StudyEvent): ExistingPlannerSlot {
  const status = event.status ?? (event.is_completed ? "done" : "planned");
  return {
    id: event.id,
    event_date: event.event_date,
    event_time: event.event_time ?? null,
    end_time: event.end_time ?? null,
    event_type: event.event_type,
    subject: event.subject,
    context_id: event.context_id ?? null,
    evaluation_id: event.evaluation_id ?? null,
    lesson_from: event.lesson_from ?? null,
    lesson_to: event.lesson_to ?? null,
    locked: event.locked ?? false,
    source: event.source ?? "manual",
    status,
    is_completed: event.is_completed ?? status === "done",
    move_count: event.move_count ?? 0,
    version: event.version,
  };
}

function eventSnapshot(event: StudyEvent): PlanChangeSnapshot {
  return {
    completed_at: event.completed_at ?? null,
    context_id: event.context_id ?? null,
    end_time: event.end_time ?? null,
    event_date: plannerDateKey(event.event_date) ?? event.event_date.slice(0, 10),
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

function slotIdentity(slot: {
  evaluation_id?: string | null;
  context_id?: string | null;
  lesson_from?: number | null;
  lesson_to?: number | null;
}): string {
  return [slot.evaluation_id ?? "", slot.context_id ?? "", slot.lesson_from ?? "", slot.lesson_to ?? ""].join(":");
}

function sameSchedule(event: StudyEvent, slot: {
  event_date: string;
  event_time: string;
  end_time: string;
  lesson_from: number | null;
  lesson_to: number | null;
}): boolean {
  return (plannerDateKey(event.event_date) ?? event.event_date.slice(0, 10)) === slot.event_date
    && (event.event_time?.slice(0, 5) ?? null) === slot.event_time
    && (event.end_time?.slice(0, 5) ?? null) === slot.end_time
    && (event.lesson_from ?? null) === slot.lesson_from
    && (event.lesson_to ?? null) === slot.lesson_to;
}

function changesForPlan(
  currentSlots: readonly VersionedStudyEvent[],
  generatedSlots: ReturnType<typeof buildPlan>["slots"],
): PlanChange[] {
  const generatedByIdentity = new Map<string, typeof generatedSlots>();
  for (const slot of generatedSlots) {
    const key = slotIdentity(slot);
    generatedByIdentity.set(key, [...(generatedByIdentity.get(key) ?? []), slot]);
  }

  const changes: PlanChange[] = [];
  for (const event of currentSlots) {
    const key = slotIdentity(event);
    const queue = generatedByIdentity.get(key) ?? [];
    const next = queue.shift();
    generatedByIdentity.set(key, queue);
    if (!next) {
      changes.push({ op: "delete", event_id: event.id, version: event.version, before: eventSnapshot(event) });
      continue;
    }
    if (sameSchedule(event, next)) continue;

    const beforeDate = plannerDateKey(event.event_date) ?? event.event_date.slice(0, 10);
    const after: PlanChangeEventValues = {
      event_date: next.event_date,
      event_time: next.event_time,
      end_time: next.end_time,
      lesson_from: next.lesson_from,
      lesson_to: next.lesson_to,
      move_count: (event.move_count ?? 0) + 1,
      original_date: event.original_date ?? beforeDate,
      original_time: event.original_time ?? event.event_time ?? null,
      source: "replan",
      status: "planned",
    };
    changes.push({
      op: "update",
      event_id: event.id,
      version: event.version,
      before: eventSnapshot(event),
      after,
    });
  }

  for (const slots of generatedByIdentity.values()) {
    for (const slot of slots) {
      changes.push({
        op: "insert",
        after: {
          event_date: slot.event_date,
          event_time: slot.event_time,
          end_time: slot.end_time,
          context_id: slot.context_id,
          evaluation_id: slot.evaluation_id,
          lesson_from: slot.lesson_from,
          lesson_to: slot.lesson_to,
          source: "replan",
          status: "planned",
          subject: slot.subject,
          title: slot.title,
        },
      });
    }
  }

  return changes;
}

function buildDeviationProposal(
  data: PlannerData,
  events: readonly StudyEvent[],
  signal: DeviationPromptSignal,
  now: Date,
): Omit<DeviationPlanProposal, "signalId"> {
  const today = plannerDateKey(now);
  if (!today) return { reason: planReason(signal.reason), changes: [], warnings: [], evaluations: [] };

  const evaluations = matchingEvaluations(data, signal, today);
  const reason = planReason(signal.reason);
  if (!evaluations.length) return { reason, changes: [], warnings: [], evaluations: [] };

  const selectedEvents = events.filter((event) => isEditableFutureStudy(event, now));
  const targetSlots = selectedEvents.filter((event) => belongsToEvaluations(event, evaluations));
  const targetIds = new Set(targetSlots.map((event) => event.id));
  const baseInput = data.buildPlanInput({ today: now, horizonDays: 30, evaluations });
  const busyEvents = events.filter((event) => dayTimeIsFuture(event.event_date, event.event_time, now) && !targetIds.has(event.id));
  const result = buildPlan({
    ...baseInput,
    busyEvents,
    existingSlots: events.map(toExistingPlannerSlot),
  });
  const generatedSlots = result.slots.filter((slot) => dayTimeIsFuture(slot.event_date, slot.event_time, now));
  const changes = changesForPlan(targetSlots, generatedSlots);

  return {
    reason,
    changes,
    warnings: result.warnings,
    evaluations,
  };
}

function dismissalKey(reason: DeviationReason, dayKey: string): string {
  return `${reason}:${dayKey}`;
}

function dismissedFor(reason: DeviationReason, dayKey: string, now: number): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!raw) return false;
    const value = JSON.parse(raw) as Partial<DismissalRecord>;
    if (value.key !== dismissalKey(reason, dayKey) || value.reason !== reason || !Number.isFinite(value.timestamp)) return false;
    const elapsed = now - (value.timestamp as number);
    return elapsed >= 0 && elapsed < DISMISSAL_WINDOW_MS;
  } catch {
    return false;
  }
}

function persistDismissal(prompt: DeviationPromptView, timestamp: number): void {
  try {
    window.localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify({
      key: dismissalKey(prompt.reason, prompt.dayKey),
      reason: prompt.reason,
      timestamp,
    } satisfies DismissalRecord));
  } catch {
    // The in-memory dismissal still hides this specific signal for the current page.
  }
}

function logPlannerEvent(
  userId: string | null,
  name: "replan_shown" | "replan_rejected",
  reason: DeviationReason,
  rows: number,
): void {
  if (!userId) return;
  const props = { reason, rows: Math.max(0, Math.floor(rows)) };
  void (async () => {
    try {
      const { error } = await supabase.from("planner_events").insert({
        user_id: userId,
        name,
        props,
      });
      if (error) console.warn("Could not record planner prompt event:", error.message);
    } catch (error) {
      console.warn("Could not record planner prompt event:", error);
    }
  })();
}

function eligibleRows(
  events: readonly StudyEvent[],
  evaluations: readonly ScheduleEvaluation[],
  now: Date,
): number {
  return events.filter((event) => isEditableFutureStudy(event, now) && belongsToEvaluations(event, evaluations)).length;
}

export function useDeviationPrompt({ plannerData, events, blocked = false, onPreview }: UseDeviationPromptOptions) {
  const focus = useOptionalFocus();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const signals = useSyncExternalStore(
    subscribeToDeviationSignals,
    getPendingDeviationSignals,
    getPendingDeviationSignals,
  );
  const [activePrompt, setActivePrompt] = useState<DeviationPromptView | null>(null);
  const [notice, setNotice] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const rejectedSignalIds = useRef(new Set<string>());
  const buildingSignalIds = useRef(new Set<string>());
  const activePromptRef = useRef(activePrompt);
  activePromptRef.current = activePrompt;
  const isInFocusBlock = !!focus?.isActive && focus.phase === "focus";
  const hasReachedFocusBoundary = !focus || (!isInFocusBlock && (
    focus.task?.isBreak === true
    || focus.lastBoundaryEvent?.kind === "pause"
    || focus.lastBoundaryEvent?.kind === "ended"
  ));

  useEffect(() => {
    const signal = signals[0];
    if (!signal) {
      if (activePromptRef.current) setActivePrompt(null);
      return;
    }
    if (!currentUser) {
      if (signal.userId === null) acknowledgeDeviationPromptSignal(signal.id);
      return;
    }
    if (signal.userId !== currentUser) {
      acknowledgeDeviationPromptSignal(signal.id);
      if (activePromptRef.current?.signalId === signal.id) setActivePrompt(null);
      return;
    }
    const now = new Date();
    const dayKey = plannerDateKey(new Date(signal.createdAt)) ?? plannerDateKey(now);
    if (!dayKey) return;
    const reason = planReason(signal.reason);
    if (dismissedFor(signal.reason, dayKey, now.getTime())) {
      acknowledgeDeviationPromptSignal(signal.id);
      if (activePromptRef.current?.signalId === signal.id) setActivePrompt(null);
      return;
    }
    if (isInFocusBlock || !hasReachedFocusBoundary || blocked || !plannerData) return;
    if (activePromptRef.current?.signalId === signal.id) return;

    const today = plannerDateKey(now) ?? dayKey;
    const targetEvaluations = matchingEvaluations(plannerData, signal, today);
    const rows = eligibleRows(events, targetEvaluations, now);
    const nextPrompt: DeviationPromptView = {
      signalId: signal.id,
      reason: signal.reason,
      planReason: reason,
      subject: signal.subject,
      plannedMin: signal.plannedMin,
      actualMin: signal.actualMin,
      rows,
      dayKey,
    };
    setNotice("");
    setActivePrompt(nextPrompt);
  }, [blocked, currentUser, events, hasReachedFocusBoundary, isInFocusBlock, plannerData, signals]);

  const recordShown = useCallback((prompt: DeviationPromptView) => {
    if (markDeviationPromptSignalShown(prompt.signalId)) {
      logPlannerEvent(currentUser ?? null, "replan_shown", prompt.reason, prompt.rows);
    }
  }, [currentUser]);

  const dismissLater = useCallback(() => {
    const prompt = activePromptRef.current;
    if (!prompt || isInFocusBlock || blocked) return;
    if (!rejectedSignalIds.current.has(prompt.signalId)) {
      rejectedSignalIds.current.add(prompt.signalId);
      persistDismissal(prompt, Date.now());
      logPlannerEvent(currentUser ?? null, "replan_rejected", prompt.reason, prompt.rows);
    }
    acknowledgeDeviationPromptSignal(prompt.signalId);
    activePromptRef.current = null;
    setActivePrompt(null);
  }, [blocked, currentUser, isInFocusBlock]);

  const reorganize = useCallback(() => {
    const prompt = activePromptRef.current;
    const signal = signals.find((candidate) => candidate.id === prompt?.signalId);
    if (!prompt || !signal || isInFocusBlock || blocked || !plannerData || buildingSignalIds.current.has(prompt.signalId)) return;

    buildingSignalIds.current.add(prompt.signalId);
    setIsBuilding(true);
    try {
      const proposal = buildDeviationProposal(plannerData, events, signal, new Date());
      if (proposal.changes.length === 0) {
        setNotice(t("piano.replanPrompt.noChanges"));
      } else {
        onPreview({ ...proposal, signalId: signal.id });
      }
      acknowledgeDeviationPromptSignal(signal.id);
      activePromptRef.current = null;
      setActivePrompt(null);
    } catch (error) {
      console.error("Could not prepare a deviation replan:", error);
      setNotice(t("piano.replanPrompt.prepareError"));
    } finally {
      buildingSignalIds.current.delete(prompt.signalId);
      setIsBuilding(false);
    }
  }, [blocked, events, isInFocusBlock, onPreview, plannerData, signals, t]);

  return {
    prompt: isInFocusBlock || blocked ? null : activePrompt,
    notice: isInFocusBlock || blocked ? "" : notice,
    isBuilding,
    onShown: recordShown,
    reorganize,
    dismissLater,
  };
}
