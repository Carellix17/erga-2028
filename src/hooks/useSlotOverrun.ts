import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOptionalFocus } from "@/contexts/FocusContext";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { plannerDataKeys, usePlannerSourceData } from "@/hooks/usePlannerData";
import {
  PlanConflictError,
  studyEventsKeys,
  useApplyPlanChanges,
  useToggleStudyEventCompleted,
  type StudyEvent,
} from "@/hooks/useStudyEvents";
import { planChangesKeys } from "@/hooks/usePlanChanges";
import {
  createInversePlanChanges,
  UndoCompletedSlotError,
  UndoTargetUnavailableError,
} from "@/components/piano/planChangeUndo";
import { placeSkipped, splitPartial, type ReplanSlot } from "@/lib/planner/replan";
import {
  plannerDateKey,
  plannerMinutesToTime,
  plannerTimeToMinutes,
  type PlannerRoutine,
} from "@/lib/planner/freeTime";
import { detectDeviation } from "@/lib/planner/deviation";
import type { PlanChange } from "@/lib/planner/types";
import {
  createSlotExtensionPlan,
  findNextScheduleItem,
  findNextStudyEvent,
  getSlotExtensionLimit,
  isAtLeastTenMinutesEarly,
  isEligiblePlannedStudy,
  isSlotOverrunThresholdReached,
  subjectAndLessons,
  taskFromEvent,
  toReplanSlot,
} from "@/lib/focus/slotOverrun";
import type { EarlyFinishPrompt, ExtensionLimit, SlotExtension } from "@/lib/focus/slotOverrun";

const OVERRUN_UI_KEY = "erga:overrun-ui:v1";
const EMPTY_EVENTS: StudyEvent[] = [];
const EMPTY_ROUTINES: PlannerRoutine[] = [];

interface OverrunUiState {
  sessionKey: string;
  decided: boolean;
  announced: boolean;
}

interface PlanUndoRecord {
  changes: PlanChange[];
  eventsBefore: StudyEvent[];
  eventsAfter: StudyEvent[];
}

function readOverrunUiState(sessionKey: string): OverrunUiState {
  try {
    const raw = window.sessionStorage.getItem(OVERRUN_UI_KEY);
    if (!raw) return { sessionKey, decided: false, announced: false };
    const value = JSON.parse(raw) as Partial<OverrunUiState>;
    if (value.sessionKey !== sessionKey) return { sessionKey, decided: false, announced: false };
    return {
      sessionKey,
      decided: value.decided === true,
      announced: value.announced === true,
    };
  } catch {
    return { sessionKey, decided: false, announced: false };
  }
}

function persistOverrunUiState(state: OverrunUiState): void {
  try {
    // This is a UI decision marker only. It deliberately contains no plan/event data.
    window.sessionStorage.setItem(OVERRUN_UI_KEY, JSON.stringify(state));
  } catch {
    // The sheet can still work for the current page if storage is unavailable.
  }
}

function isPlanConflict(error: unknown): boolean {
  return error instanceof PlanConflictError
    || (error instanceof Error && (error.message === "version_conflict" || error.message === "409"));
}

export function useSlotOverrun() {
  const focus = useOptionalFocus();
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast, dismiss } = useToast();
  const needsPlannerData = !!(focus?.isActive || focus?.lastEndedSession);
  const plannerQuery = usePlannerSourceData(needsPlannerData);
  const plannerData = plannerQuery.data;
  const refetchPlannerData = plannerQuery.refetch;
  const events = (plannerData?.events as unknown as StudyEvent[] | undefined) ?? EMPTY_EVENTS;
  const applyPlanChanges = useApplyPlanChanges();
  const toggleStudyEventCompleted = useToggleStudyEventCompleted();
  const [now, setNow] = useState(() => Date.now());
  const [uiState, setUiState] = useState<OverrunUiState | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [earlyFinish, setEarlyFinish] = useState<EarlyFinishPrompt | null>(null);
  const [noSpacePrompt, setNoSpacePrompt] = useState<{
    kind: "no_space";
    slot: ReplanSlot;
    deadline: string;
  } | null>(null);
  const handledEndedSessions = useRef(new Set<string>());
  const actionInFlight = useRef(false);

  const activeSessionKey = focus?.sessionKey ?? null;
  const activeUiState = activeSessionKey
    ? uiState?.sessionKey === activeSessionKey ? uiState : readOverrunUiState(activeSessionKey)
    : null;

  const updateUiState = useCallback((sessionKey: string, patch: Partial<Pick<OverrunUiState, "decided" | "announced">>) => {
    const previous = readOverrunUiState(sessionKey);
    const next = { ...previous, ...patch };
    persistOverrunUiState(next);
    setUiState(next);
  }, []);

  useEffect(() => {
    if (!focus?.isActive) return;
    setNow(Date.now());
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    const refresh = () => { if (document.visibilityState !== "hidden") tick(); };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [focus?.isActive, focus?.sessionKey]);

  const activeEvent = useMemo(() => {
    const eventId = focus?.task?.eventId;
    return eventId ? events.find((event) => event.id === eventId) ?? null : null;
  }, [events, focus?.task?.eventId]);

  const isPlannedTimedStudy = !!focus?.isActive && isEligiblePlannedStudy(focus.task, activeEvent);
  const isOverrunReached = isPlannedTimedStudy && activeEvent !== null && isSlotOverrunThresholdReached(activeEvent, now);
  const canShowOverrun = !!isOverrunReached
    && focus?.phase === "focus"
    && focus.isRunning
    && activeUiState?.decided !== true
    && !noSpacePrompt;

  const routines = plannerData?.routines ?? EMPTY_ROUTINES;
  const extension = useMemo<SlotExtension | null>(() => {
    if (!activeEvent || !plannerData) return null;
    const limit = getSlotExtensionLimit(activeEvent, events, routines);
    if (limit.minutes <= 0) return null;
    return createSlotExtensionPlan(activeEvent, events, routines, limit.minutes);
  }, [activeEvent, events, plannerData, routines]);
  const extensionLimitInfo = useMemo(() => activeEvent && plannerData
    ? getSlotExtensionLimit(activeEvent, events, routines)
    : { minutes: 0, time: null, item: null }, [activeEvent, events, plannerData, routines]);

  const nextItem = useMemo(() => {
    if (!activeEvent) return null;
    const day = plannerDateKey(activeEvent.event_date);
    const end = plannerTimeToMinutes(activeEvent.end_time);
    if (!day || end === null) return null;
    return findNextScheduleItem(day, end, activeEvent.id, events, routines);
  }, [activeEvent, events, routines]);

  const lessonDetails = activeEvent && focus?.task ? subjectAndLessons(activeEvent, focus.task) : null;
  const lessonLabel = lessonDetails?.lessonFrom != null && lessonDetails.lessonTo != null
    ? lessonDetails.lessonFrom === lessonDetails.lessonTo
      ? t("focusTimer.lessonNumber", { number: lessonDetails.lessonFrom + 1 })
      : t("focusTimer.lessonRange", { from: lessonDetails.lessonFrom + 1, to: lessonDetails.lessonTo + 1 })
    : null;

  useEffect(() => {
    if (!canShowOverrun || !activeSessionKey || activeUiState?.announced) return;
    updateUiState(activeSessionKey, { announced: true });
    setLiveAnnouncement(t("focusTimer.overrunAnnouncement", { subject: lessonDetails?.subject ?? t("focusTimer.defaultSubject") }));
    window.setTimeout(() => setLiveAnnouncement(""), 1500);
  }, [activeSessionKey, activeUiState?.announced, canShowOverrun, lessonDetails?.subject, t, updateUiState]);

  const invalidatePlannerQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
      queryClient.invalidateQueries({ queryKey: plannerDataKeys.all(currentUser) }),
      queryClient.invalidateQueries({ queryKey: planChangesKeys.all(currentUser) }),
    ]);
  }, [currentUser, queryClient]);

  const showConflict = useCallback(async () => {
    toast({
      title: t("piano.slotPlanChanged"),
      description: t("piano.slotPlanChangedDesc"),
      duration: 10_000,
      "aria-live": "polite",
    });
    await invalidatePlannerQueries();
  }, [invalidatePlannerQueries, t, toast]);

  const reportSaveError = useCallback((error: unknown) => {
    if (isPlanConflict(error)) {
      void showConflict();
      return;
    }
    toast({
      title: t("piano.error"),
      description: t("piano.errorSave"),
      duration: 10_000,
      variant: "destructive",
      "aria-live": "polite",
    });
  }, [showConflict, t, toast]);

  const undoPlanRef = useRef<((record: PlanUndoRecord) => Promise<void>) | null>(null);

  const showUndoToast = useCallback((
    title: string,
    record: PlanUndoRecord,
  ) => {
    const toastId: { current?: string } = {};
    const result = toast({
      title,
      duration: 10_000,
      "aria-live": "polite",
      action: createElement(ToastAction, {
        altText: t("focusTimer.undo"),
        className: "min-h-11",
        onClick: (event) => {
          event.preventDefault();
          const undo = undoPlanRef.current;
          if (undo) {
            void undo(record).finally(() => {
              if (toastId.current) dismiss(toastId.current);
            });
          }
        },
      }, t("focusTimer.undo")) as unknown as ToastActionElement,
    });
    toastId.current = result.id;
  }, [dismiss, t, toast]);

  const undoPlan = useCallback(async (record: PlanUndoRecord) => {
    try {
      const plannerQueryKey = plannerDataKeys.all(currentUser);
      await refetchPlannerData();
      const latest = queryClient.getQueryData<{ events: StudyEvent[] }>(plannerQueryKey)?.events ?? [];
      const inverse = createInversePlanChanges(record.changes, record.eventsBefore, record.eventsAfter, latest);
      if (!inverse.length) return;
      await applyPlanChanges.mutateAsync({ reason: "manual", changes: inverse });
      await invalidatePlannerQueries();
      toast({ title: t("piano.changePreview.undone"), "aria-live": "polite" });
    } catch (error) {
      if (error instanceof UndoCompletedSlotError) {
        toast({ title: t("piano.planHistory.completed", { slot: error.slotTitle }), variant: "destructive" });
      } else if (error instanceof UndoTargetUnavailableError || isPlanConflict(error)) {
        toast({ title: t("piano.planHistory.unavailable"), variant: "destructive" });
        await invalidatePlannerQueries();
      } else {
        reportSaveError(error);
      }
    }
  }, [applyPlanChanges, currentUser, invalidatePlannerQueries, queryClient, refetchPlannerData, reportSaveError, t, toast]);
  undoPlanRef.current = undoPlan;

  const applyPackage = useCallback(async (
    reason: "overrun" | "manual",
    changes: PlanChange[],
    undoChanges: PlanChange[] = changes,
    undoTitle = t("focusTimer.planAdjusted"),
  ): Promise<boolean> => {
    if (!changes.length) return false;
    const plannerQueryKey = plannerDataKeys.all(currentUser);
    const eventsBefore = queryClient.getQueryData<{ events: StudyEvent[] }>(plannerQueryKey)?.events ?? events;
    try {
      await applyPlanChanges.mutateAsync({ reason, changes });
      await refetchPlannerData();
      const eventsAfter = queryClient.getQueryData<{ events: StudyEvent[] }>(plannerQueryKey)?.events ?? [];
      await invalidatePlannerQueries();
      if (undoChanges.length) showUndoToast(undoTitle, { changes: undoChanges, eventsBefore, eventsAfter });
      return true;
    } catch (error) {
      reportSaveError(error);
      return false;
    }
  }, [applyPlanChanges, currentUser, events, invalidatePlannerQueries, queryClient, refetchPlannerData, reportSaveError, showUndoToast, t]);

  const markEndedSlotDone = useCallback(async (event: StudyEvent): Promise<void> => {
    const status = event.status ?? (event.is_completed ? "done" : "planned");
    if (status === "done" || event.is_completed === true || event.completed_at) return;
    if (!Number.isInteger(event.version) || (event.version as number) < 0) {
      throw new Error("version_required");
    }

    if (event.lesson_from != null && event.lesson_to != null && event.lesson_to >= event.lesson_from) {
      const slot = toReplanSlot(event);
      const completedOrders = Array.from(
        { length: event.lesson_to - event.lesson_from + 1 },
        (_unused, index) => event.lesson_from! + index,
      );
      const changes = splitPartial(slot, completedOrders);
      if (changes.length) {
        await applyPlanChanges.mutateAsync({ reason: "manual", changes });
        await invalidatePlannerQueries();
        return;
      }
    }
    await toggleStudyEventCompleted.mutateAsync({ id: event.id, next: true, version: event.version });
    await invalidatePlannerQueries();
  }, [applyPlanChanges, invalidatePlannerQueries, toggleStudyEventCompleted]);

  useEffect(() => {
    const ended = focus?.lastEndedSession;
    if (!ended || handledEndedSessions.current.has(ended.sessionKey) || !plannerQuery.isFetched || !plannerData) return;
    handledEndedSessions.current.add(ended.sessionKey);

    void (async () => {
      try {
        const event = ended.task.eventId
          ? events.find((item) => item.id === ended.task.eventId) ?? null
          : null;
        const countAsFinished = ended.reason === "finished" || ended.reason === "overrun";
        if (countAsFinished && event?.event_type === "study") {
          try {
            await markEndedSlotDone(event);
          } catch (error) {
            reportSaveError(error);
          }

          if (isAtLeastTenMinutesEarly(event, ended.endedAt)) {
            const day = plannerDateKey(event.event_date);
            const endMinute = plannerTimeToMinutes(event.end_time);
            const nextStudyEvent = findNextStudyEvent(event, events);
            const scheduleNext = day !== null && endMinute !== null
              ? findNextScheduleItem(day, endMinute, event.id, events, routines)
              : null;
            const details = subjectAndLessons(event, ended.task);
            setEarlyFinish({
              sessionKey: ended.sessionKey,
              event,
              subject: details.subject,
              lessonFrom: details.lessonFrom,
              lessonTo: details.lessonTo,
              nextItem: scheduleNext,
              nextStudyEvent,
            });
          }

          const start = plannerTimeToMinutes(event.event_time);
          const end = plannerTimeToMinutes(event.end_time);
          if (start !== null && end !== null && end > start) {
            const plannedMin = end - start;
            const actualMin = Math.round(ended.focusSeconds / 60);
            if (Math.abs(actualMin - plannedMin) >= 10) {
              const ratio = plannedMin > 0 ? actualMin / plannedMin : 1;
              const deviation = detectDeviation({
                plannedMin,
                actualMin,
                lessonRatios: ratio < 0.7 ? [ratio] : [],
                blockRunning: false,
              });
              if (deviation) toast({ title: t(`focusTimer.deviation.${deviation}`), "aria-live": "polite" });
            }
          }
        }
      } finally {
        focusRef.current?.acknowledgeEndedSession(ended.sessionKey);
      }
    })();
  }, [events, focus?.lastEndedSession, markEndedSlotDone, plannerData, plannerQuery.isFetched, reportSaveError, routines, t, toast]);

  const dismissOverrun = useCallback(() => {
    if (activeSessionKey) updateUiState(activeSessionKey, { decided: true });
  }, [activeSessionKey, updateUiState]);

  const finishSession = useCallback(() => {
    if (!focus || !activeSessionKey) return;
    updateUiState(activeSessionKey, { decided: true });
    const reason = focus.overrun > 0 ? "overrun" : "finished";
    focus.endWithReason(reason);
  }, [activeSessionKey, focus, updateUiState]);

  const extendSlot = useCallback(async (minutes: number) => {
    if (!focus || !activeSessionKey || !activeEvent || !plannerData || actionInFlight.current) return;
    const plan = createSlotExtensionPlan(activeEvent, events, routines, minutes);
    if (!plan) return;
    actionInFlight.current = true;
    updateUiState(activeSessionKey, { decided: true });
    try {
      const applied = await applyPackage("overrun", plan.changes, plan.changes, t("focusTimer.extendedToast", { minutes }));
      if (applied) focusRef.current?.extendByMinutes(minutes);
    } finally {
      actionInFlight.current = false;
    }
  }, [activeEvent, activeSessionKey, applyPackage, events, focus, plannerData, routines, t, updateUiState]);

  const stopHere = useCallback(async () => {
    if (!focus || !activeSessionKey || !activeEvent || actionInFlight.current) return;
    if (!plannerData) {
      reportSaveError(new Error("planner_data_unavailable"));
      return;
    }
    if (!Number.isInteger(activeEvent.version) || (activeEvent.version as number) < 0) {
      reportSaveError(new Error("version_required"));
      return;
    }
    actionInFlight.current = true;
    updateUiState(activeSessionKey, { decided: true });
    const eventSlot = toReplanSlot(activeEvent);
    const day = plannerDateKey(activeEvent.event_date);
    const evaluationDate = plannerData?.evaluations.find((evaluation) => evaluation.id === activeEvent.evaluation_id)?.date;
    const deadline = plannerDateKey(evaluationDate ?? activeEvent.event_date) ?? activeEvent.event_date.slice(0, 10);
    const completed = activeEvent.context_id
      ? plannerData?.completedByContext[activeEvent.context_id] ?? []
      : [];
    const splitChanges = splitPartial(eventSlot, completed);
    const remainderInsert = splitChanges.find((change): change is Extract<PlanChange, { op: "insert" }> => change.op === "insert");
    const completedPrefix = splitChanges.find((change): change is Extract<PlanChange, { op: "update" }> => change.op === "update");

    if (completedPrefix && !remainderInsert) {
      try {
        await applyPackage("overrun", [completedPrefix], [], t("focusTimer.stoppedToast"));
        focusRef.current?.endWithReason("interrupted");
      } finally {
        actionInFlight.current = false;
      }
      return;
    }

    let placeSlot = eventSlot;
    if (remainderInsert && activeEvent.lesson_from != null && activeEvent.lesson_to != null) {
      const from = remainderInsert.after.lesson_from;
      const start = plannerTimeToMinutes(activeEvent.event_time);
      const end = plannerTimeToMinutes(activeEvent.end_time);
      const totalLessons = activeEvent.lesson_to - activeEvent.lesson_from + 1;
      const remainingLessons = typeof from === "number" ? activeEvent.lesson_to - from + 1 : totalLessons;
      const duration = start !== null && end !== null && end > start
        ? Math.max(1, Math.ceil((end - start) * remainingLessons / Math.max(1, totalLessons)))
        : 0;
      placeSlot = {
        ...eventSlot,
        lesson_from: typeof from === "number" ? from : eventSlot.lesson_from,
        event_time: activeEvent.event_time ?? null,
        end_time: start !== null && duration > 0 ? plannerMinutesToTime(Math.min(24 * 60, start + duration)) : activeEvent.end_time ?? null,
      };
    }

    const placeResult = day ? placeSkipped(placeSlot, {
      now: new Date(now),
      deadline,
      routines,
      busyEvents: events.filter((event) => event.id !== activeEvent.id),
      existingSlots: events.map(toReplanSlot),
      settings: plannerData?.settings ?? {},
    }) : { changes: [], needsUser: true as const, reason: "no_space" as const };

    if (placeResult.needsUser || placeResult.reason === "no_space" || placeResult.status !== "moved") {
      focus.minimize();
      setNoSpacePrompt({ kind: "no_space", slot: eventSlot, deadline });
      focus.endWithReason("interrupted");
      actionInFlight.current = false;
      return;
    }

    let changes: PlanChange[];
    let undoChanges: PlanChange[];
    if (remainderInsert && completedPrefix) {
      const move = placeResult.changes.find((change): change is Extract<PlanChange, { op: "update" }> => change.op === "update");
      if (!move) {
        focus.minimize();
        setNoSpacePrompt({ kind: "no_space", slot: eventSlot, deadline });
        focus.endWithReason("interrupted");
        actionInFlight.current = false;
        return;
      }
      const insertedRemainder: PlanChange = {
        ...remainderInsert,
        after: {
          ...remainderInsert.after,
          event_date: move.after.event_date ?? activeEvent.event_date,
          event_time: move.after.event_time ?? activeEvent.event_time ?? null,
          end_time: move.after.end_time ?? activeEvent.end_time ?? null,
          move_count: move.after.move_count ?? (activeEvent.move_count ?? 0) + 1,
          original_date: move.after.original_date ?? activeEvent.original_date ?? activeEvent.event_date,
          original_time: move.after.original_time ?? activeEvent.original_time ?? activeEvent.event_time ?? null,
          source: "replan",
          status: "planned",
        },
      };
      changes = [completedPrefix, insertedRemainder];
      // Completed minilessons stay done; undo removes only the newly placed continuation.
      undoChanges = [insertedRemainder];
    } else if (remainderInsert && !completedPrefix) {
      focus.minimize();
      setNoSpacePrompt({ kind: "no_space", slot: eventSlot, deadline });
      focus.endWithReason("interrupted");
      actionInFlight.current = false;
      return;
    } else {
      changes = placeResult.changes;
      undoChanges = changes;
    }

    try {
      const applied = await applyPackage("overrun", changes, undoChanges, t("focusTimer.stoppedToast"));
      if (!applied) {
        focusRef.current?.endWithReason("interrupted");
        return;
      }
      focusRef.current?.endWithReason("interrupted");
    } finally {
      actionInFlight.current = false;
    }
  }, [activeEvent, activeSessionKey, applyPackage, events, focus, now, plannerData, reportSaveError, routines, t, updateUiState]);

  const dismissEarlyFinish = useCallback(() => setEarlyFinish(null), []);

  const startNextStudy = useCallback(() => {
    if (!earlyFinish?.nextStudyEvent) return;
    const task = taskFromEvent(earlyFinish.nextStudyEvent);
    setEarlyFinish(null);
    focusRef.current?.startSession(task, task.durationMinutes);
  }, [earlyFinish]);

  const startBreak = useCallback(() => {
    setEarlyFinish(null);
    focusRef.current?.startPause();
  }, []);

  const leaveFree = useCallback(() => setEarlyFinish(null), []);

  const dismissNoSpace = useCallback(() => setNoSpacePrompt(null), []);

  const navigateToPlan = useCallback((navigate: (to: string) => void) => {
    setNoSpacePrompt(null);
    navigate("/app?tab=piano&view=week");
  }, []);

  const activeSubject = lessonDetails?.subject ?? null;
  const overrunAnnouncement = liveAnnouncement;

  return {
    open: canShowOverrun,
    overrun: activeEvent && activeSessionKey ? {
      sessionKey: activeSessionKey,
      subject: activeSubject ?? t("focusTimer.defaultSubject"),
      lessonLabel,
      nextItem,
      extensionMinutes: extension?.minutes ?? 0,
      extensionLimit: extensionLimitInfo,
      isSaving: applyPlanChanges.isPending || focus?.isSyncing === true,
    } : null,
    earlyFinish,
    noSpacePrompt,
    announcement: overrunAnnouncement,
    isSaving: applyPlanChanges.isPending || focus?.isSyncing === true,
    dismissOverrun,
    finishSession,
    extendSlot,
    stopHere,
    dismissEarlyFinish,
    startNextStudy,
    startBreak,
    leaveFree,
    dismissNoSpace,
    navigateToPlan,
  };
}
