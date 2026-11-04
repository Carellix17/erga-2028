import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useOptionalFocus } from "@/contexts/FocusContext";
import type { PlannerData } from "@/hooks/usePlannerData";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import {
  plannerDateKey,
  plannerMinutesToTime,
  plannerTimeToMinutes,
} from "@/lib/planner/freeTime";
import {
  detectSkipped,
  placeSkipped,
  splitPartial,
  type ReplanSlot,
} from "@/lib/planner/replan";
import type { PlanChange, PlanChangeReason } from "@/lib/planner/types";
import type { PlanWarning, ScheduleEvaluation } from "@/lib/planner/schedule";
import { signalAutoReplanApplied } from "@/lib/pushSupport";

export type ReplanPrompt =
  | {
      kind: "no_space";
      slot: ReplanSlot;
      deadline: string;
    }
  | {
      kind: "move_limit";
      slot: ReplanSlot;
      deadline: string;
      suggestedChanges: PlanChange[];
      suggestedDate: string;
      suggestedTime: string;
    };

export interface AutoReplanPreview {
  reason: PlanChangeReason;
  changes: PlanChange[];
  warnings: PlanWarning[];
  evaluations: readonly Pick<ScheduleEvaluation, "id" | "title" | "subject">[];
}

export interface AutoReplanApplyRequest {
  reason: PlanChangeReason;
  changes: PlanChange[];
  kind: "moved" | "partial" | "no_space" | "kept" | "split";
  slot: ReplanSlot;
  deadline?: string;
  targetDate?: string;
  targetTime?: string;
}

export type AutoReplanApplyResult = "applied" | "conflict" | "failed";

interface UseAutoReplanOptions {
  plannerData: PlannerData | undefined;
  events?: readonly StudyEvent[];
  enabled: boolean;
  blocked: boolean;
  prompt: ReplanPrompt | null;
  onPromptChange: (prompt: ReplanPrompt | null) => void;
  onPreview: (proposal: AutoReplanPreview) => void;
  onApply: (request: AutoReplanApplyRequest) => Promise<AutoReplanApplyResult>;
}

interface ReplanCandidate {
  slot: ReplanSlot;
  kind: "skipped" | "partial";
}

interface ReadyPackage {
  candidate: ReplanCandidate;
  changes: PlanChange[];
  targetDate?: string;
  targetTime?: string;
}

interface DeferredPrompt {
  candidate: ReplanCandidate;
  prompt: ReplanPrompt;
}

function versionKey(slot: ReplanSlot, events: readonly ReplanSlot[]): string {
  const scheduleVersion = events
    .map((event) => [
      event.id,
      event.version,
      event.event_date,
      event.event_time,
      event.end_time,
      event.status,
      event.is_completed,
      event.move_count,
      event.locked,
      event.source,
      event.lesson_from,
      event.lesson_to,
    ])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  return `${slot.id}:${slot.version}|${JSON.stringify(scheduleVersion)}`;
}

function toReplanSlot(event: StudyEvent): ReplanSlot {
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

function bySchedule(left: ReplanCandidate, right: ReplanCandidate): number {
  const dateOrder = (plannerDateKey(left.slot.event_date) ?? "").localeCompare(
    plannerDateKey(right.slot.event_date) ?? "",
  );
  if (dateOrder !== 0) return dateOrder;
  return (plannerTimeToMinutes(left.slot.event_time) ?? 0)
    - (plannerTimeToMinutes(right.slot.event_time) ?? 0)
    || left.slot.id.localeCompare(right.slot.id);
}

function firstUpdate(changes: readonly PlanChange[]): Extract<PlanChange, { op: "update" }> | undefined {
  return changes.find((change): change is Extract<PlanChange, { op: "update" }> => change.op === "update");
}

function promptAfterMoveLimit(
  slot: ReplanSlot,
  deadline: string,
  routines: PlannerData["routines"],
  events: readonly ReplanSlot[],
  settings: PlannerData["settings"],
  now: Date,
): ReplanPrompt {
  // placeSkipped normally stops before a third automatic move. For the explicit
  // user choice, compute the same first-free-time proposal, then count that
  // confirmed move as the third one.
  const candidate = placeSkipped({ ...slot, move_count: Math.max(0, slot.move_count - 1) }, {
    now,
    deadline,
    routines,
    busyEvents: events.filter((event) => event.id !== slot.id),
    existingSlots: events,
    settings,
  });
  const update = firstUpdate(candidate.changes);
  const date = update?.after.event_date;
  const time = update?.after.event_time;
  if (candidate.status === "moved" && update && typeof date === "string" && typeof time === "string") {
    return {
      kind: "move_limit",
      slot,
      deadline,
      suggestedChanges: candidate.changes.map((change): PlanChange => change.op === "update"
        ? { ...change, after: { ...change.after, move_count: slot.move_count + 1 } }
        : change),
      suggestedDate: date,
      suggestedTime: time,
    };
  }
  return { kind: "no_space", slot, deadline };
}

function splitMovedSlot(
  prompt: Extract<ReplanPrompt, { kind: "move_limit" }>,
  t: (key: string, options?: Record<string, unknown>) => string,
): PlanChange[] {
  const update = firstUpdate(prompt.suggestedChanges);
  if (!update) return [];
  const start = plannerTimeToMinutes(update.after.event_time ?? prompt.slot.event_time);
  const end = plannerTimeToMinutes(update.after.end_time ?? prompt.slot.end_time);
  if (start === null || end === null || end - start < 2) return [];

  const splitAt = start + Math.floor((end - start) / 2);
  const slot = prompt.slot;
  const from = slot.lesson_from;
  const to = slot.lesson_to;
  const canSplitLessons = from !== null && from !== undefined
    && to !== null && to !== undefined
    && Number.isInteger(from) && Number.isInteger(to) && to > from;
  const firstLessonTo = canSplitLessons ? from + Math.ceil((to - from + 1) / 2) - 1 : to ?? null;
  const secondLessonFrom = canSplitLessons ? firstLessonTo + 1 : from ?? null;
  const baseTitle = slot.title?.trim() || slot.subject || t("piano.type_study");
  const firstTitle = t("piano.autoReplan.partTitle", { title: baseTitle, part: 1 });
  const secondTitle = t("piano.autoReplan.partTitle", { title: baseTitle, part: 2 });
  const eventDate = update.after.event_date ?? slot.event_date;
  const firstAfter = {
    ...update.after,
    event_date: eventDate,
    event_time: update.after.event_time ?? slot.event_time,
    end_time: plannerMinutesToTime(splitAt),
    lesson_from: from ?? null,
    lesson_to: firstLessonTo,
    move_count: slot.move_count + 1,
    original_date: update.after.original_date ?? slot.original_date ?? slot.event_date,
    original_time: update.after.original_time ?? slot.original_time ?? slot.event_time,
    status: "planned" as const,
    source: "replan" as const,
    title: firstTitle,
  };
  const second: PlanChange = {
    op: "insert",
    after: {
      event_date: eventDate,
      event_time: plannerMinutesToTime(splitAt),
      end_time: plannerMinutesToTime(end),
      context_id: slot.context_id,
      evaluation_id: slot.evaluation_id,
      lesson_from: secondLessonFrom,
      lesson_to: to ?? null,
      source: "replan",
      subject: slot.subject,
      title: secondTitle,
    },
  };
  return [{ ...update, after: firstAfter }, second];
}

export function useAutoReplan({
  plannerData,
  events: queryEvents,
  enabled,
  blocked,
  prompt,
  onPromptChange,
  onPreview,
  onApply,
}: UseAutoReplanOptions) {
  const { t } = useTranslation();
  const focus = useOptionalFocus();
  const optionsRef = useRef<UseAutoReplanOptions>({
    plannerData,
    events: queryEvents,
    enabled,
    blocked,
    prompt,
    onPromptChange,
    onPreview,
    onApply,
  });
  optionsRef.current = { plannerData, events: queryEvents, enabled, blocked, prompt, onPromptChange, onPreview, onApply };
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const translateRef = useRef(t);
  translateRef.current = t;
  const attemptedVersions = useRef(new Set<string>());
  const conflictedSlotIds = useRef(new Set<string>());
  const checking = useRef(false);
  const applyingChoice = useRef(false);
  const initialCheckDone = useRef(false);

  const checkNow = useCallback(async () => {
    const current = optionsRef.current;
    const data = current.plannerData;
    if (
      !current.enabled
      || current.blocked
      || current.prompt
      || !data
      || checking.current
      || applyingChoice.current
    ) return;

    checking.current = true;
    try {
      const now = new Date(Date.now());
      const activeSessionSlotId = focusRef.current?.isActive
        ? focusRef.current.task?.eventId ?? null
        : null;
      const events = current.events === undefined
        ? data.events
        : current.events.map(toReplanSlot);
      const skipped = detectSkipped(events, now, activeSessionSlotId);
      const partialAsPlanned = events
        .filter((event) => event.status === "partial")
        .map((event) => ({ ...event, status: "planned" as const }));
      const overduePartialIds = new Set(
        detectSkipped(partialAsPlanned, now, activeSessionSlotId).map((slot) => slot.id),
      );
      const candidates: ReplanCandidate[] = [
        ...skipped.map((slot) => ({ slot, kind: "skipped" as const })),
        ...events
          .filter((event) => overduePartialIds.has(event.id))
          .map((slot) => ({ slot, kind: "partial" as const })),
      ].sort(bySchedule);
      const unattempted = candidates.filter((candidate) =>
        !conflictedSlotIds.current.has(candidate.slot.id)
        && !attemptedVersions.current.has(versionKey(candidate.slot, events)),
      );
      if (!unattempted.length) return;

      const ready: ReadyPackage[] = [];
      let deferred: DeferredPrompt | null = null;
      for (const candidate of unattempted) {
        const slot = candidate.slot;
        if (candidate.kind === "partial") {
          const changes = splitPartial(slot, data.completedByContext?.[slot.context_id ?? ""] ?? []);
          if (changes.length) ready.push({ candidate, changes });
          continue;
        }

        const evaluation = data.evaluations?.find((item) => item.id === slot.evaluation_id);
        const deadline = plannerDateKey(evaluation?.date ?? slot.event_date) ?? slot.event_date.slice(0, 10);
        const options = {
          now,
          deadline,
          routines: data.routines ?? [],
          busyEvents: events.filter((event) => event.id !== slot.id),
          existingSlots: events,
          settings: data.settings ?? {},
        };
        const result = placeSkipped(slot, options);
        if (result.needsUser && result.reason === "move_limit") {
          deferred = {
            candidate,
            prompt: promptAfterMoveLimit(
              slot,
              deadline,
              data.routines ?? [],
              events,
              data.settings ?? {},
              now,
            ),
          };
          break;
        }
        if (result.reason === "no_space" || result.reason === "locked") {
          deferred = { candidate, prompt: { kind: "no_space", slot, deadline } };
          break;
        }
        if (result.changes.length) {
          const update = firstUpdate(result.changes);
          ready.push({
            candidate,
            changes: result.changes,
            targetDate: update?.after.event_date,
            targetTime: update?.after.event_time,
          });
        }
      }

      if (ready.length) {
        ready.forEach(({ candidate }) => attemptedVersions.current.add(versionKey(candidate.slot, events)));
        const changes = ready.flatMap(({ changes: readyChanges }) => readyChanges);
        const firstMoved = ready.find(({ candidate }) => candidate.kind === "skipped");
        const packageKind = firstMoved ? "moved" : "partial";
        const first = firstMoved ?? ready[0];
        const request: AutoReplanApplyRequest = {
          reason: "skip",
          changes,
          kind: packageKind,
          slot: first.candidate.slot,
          targetDate: first.targetDate,
          targetTime: first.targetTime,
        };
        if (data.askBeforeMove === true) {
          current.onPreview({ reason: "skip", changes, warnings: [], evaluations: [] });
          return;
        }
        applyingChoice.current = true;
        try {
          const result = await current.onApply(request);
          if (result === "applied") signalAutoReplanApplied();
          if (result === "conflict") {
            ready.forEach(({ candidate }) => conflictedSlotIds.current.add(candidate.slot.id));
          }
        } finally {
          applyingChoice.current = false;
        }
        return;
      }

      if (deferred) {
        attemptedVersions.current.add(versionKey(deferred.candidate.slot, events));
        current.onPromptChange(deferred.prompt);
      }
    } finally {
      checking.current = false;
    }
  }, []);

  const checkRef = useRef(checkNow);
  checkRef.current = checkNow;

  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const scheduleNextMinute = () => {
      const now = Date.now();
      const delay = 60_000 - (now % 60_000);
      timer = window.setTimeout(() => {
        if (document.visibilityState !== "hidden") void checkRef.current();
        scheduleNextMinute();
      }, delay);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") void checkRef.current();
    };

    scheduleNextMinute();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !plannerData || blocked || prompt || initialCheckDone.current) return;
    initialCheckDone.current = true;
    void checkRef.current();
  }, [blocked, enabled, plannerData, prompt]);

  const handleKeep = useCallback(async (choicePrompt: ReplanPrompt | null) => {
    if (!choicePrompt || choicePrompt.kind !== "move_limit" || applyingChoice.current) return;
    if (!firstUpdate(choicePrompt.suggestedChanges)) return;
    applyingChoice.current = true;
    optionsRef.current.onPromptChange(null);
    try {
      const result = await optionsRef.current.onApply({
        reason: "skip",
        changes: choicePrompt.suggestedChanges,
        kind: "kept",
        slot: choicePrompt.slot,
        targetDate: choicePrompt.suggestedDate,
        targetTime: choicePrompt.suggestedTime,
      });
      if (result === "conflict") conflictedSlotIds.current.add(choicePrompt.slot.id);
    } finally {
      applyingChoice.current = false;
    }
  }, []);

  const handleSplit = useCallback(async (choicePrompt: ReplanPrompt | null) => {
    if (!choicePrompt || choicePrompt.kind !== "move_limit" || applyingChoice.current) return;
    const changes = splitMovedSlot(choicePrompt, translateRef.current);
    if (!changes.length) return;
    applyingChoice.current = true;
    optionsRef.current.onPromptChange(null);
    try {
      const result = await optionsRef.current.onApply({
        reason: "skip",
        changes,
        kind: "split",
        slot: choicePrompt.slot,
        targetDate: choicePrompt.suggestedDate,
        targetTime: choicePrompt.suggestedTime,
      });
      if (result === "conflict") conflictedSlotIds.current.add(choicePrompt.slot.id);
    } finally {
      applyingChoice.current = false;
    }
  }, []);

  return { handleKeep, handleSplit };
}
