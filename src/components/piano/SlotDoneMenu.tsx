import { useContext, useRef } from "react";
import { QueryClientContext, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useToggleEvaluationCompleted } from "@/hooks/useEvaluations";
import {
  PlanConflictError,
  studyEventsKeys,
  useApplyPlanChanges,
  useToggleStudyEventCompleted,
  type StudyEvent,
} from "@/hooks/useStudyEvents";
import type { PlannerEntry } from "@/lib/plannerEntries";
import { splitPartial, type ReplanSlot } from "@/lib/planner/replan";
import type {
  PlanChange,
  PlanChangeEventValues,
  PlanChangeSnapshot,
} from "@/lib/planner/types";
import type { PlanSlotData } from "./PlanSlot";

interface SlotDoneMenuProps {
  entry: PlannerEntry;
  slot: PlanSlotData;
}

type UndoRecord =
  | { kind: "plan"; changes: PlanChange[]; eventsBefore: StudyEvent[]; eventsAfter: StudyEvent[] }
  | { kind: "evaluation"; id: string; completedBefore: boolean };

class UndoTargetUnavailableError extends Error {
  constructor() {
    super("undo_target_unavailable");
    this.name = "UndoTargetUnavailableError";
  }
}

const PLAN_EVENT_FIELDS = [
  "context_id",
  "end_time",
  "event_date",
  "event_time",
  "evaluation_id",
  "lesson_from",
  "lesson_to",
  "move_count",
  "original_date",
  "original_time",
  "source",
  "status",
  "subject",
  "title",
] as const;

function toReplanSlot(entry: PlannerEntry): ReplanSlot | null {
  if (entry.original.kind !== "studyEvent") return null;
  const event = entry.original.data;
  return {
    completed_at: event.completed_at ?? null,
    context_id: event.context_id ?? entry.contextId ?? null,
    end_time: event.end_time ?? entry.endTime ?? null,
    event_date: event.event_date,
    event_time: event.event_time ?? entry.time ?? null,
    event_type: event.event_type,
    evaluation_id: event.evaluation_id ?? null,
    id: event.id,
    is_completed: event.is_completed ?? entry.completed,
    lesson_from: event.lesson_from ?? entry.lessonFrom ?? null,
    lesson_to: event.lesson_to ?? entry.lessonTo ?? null,
    locked: event.locked ?? entry.locked ?? false,
    move_count: event.move_count ?? entry.moveCount ?? 0,
    notes: event.notes ?? entry.notes ?? null,
    original_date: event.original_date ?? entry.originalDate ?? null,
    original_time: event.original_time ?? entry.originalTime ?? null,
    source: event.source ?? entry.source ?? "manual",
    status: event.status ?? entry.status ?? (entry.completed ? "done" : "planned"),
    subject: event.subject,
    title: event.title,
    version: event.version ?? entry.version ?? 0,
  };
}

function snapshotForSlot(slot: ReplanSlot): PlanChangeSnapshot {
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

function eventFromSnapshot(snapshot: PlanChangeSnapshot, id: string, version: number): StudyEvent {
  const eventType = snapshot.event_type === "test" || snapshot.event_type === "assignment"
    ? snapshot.event_type
    : "study";
  return {
    id,
    subject: snapshot.subject ?? "",
    title: snapshot.title ?? "",
    event_date: snapshot.event_date ?? "",
    event_time: snapshot.event_time ?? null,
    event_type: eventType,
    completed_at: snapshot.completed_at ?? null,
    context_id: snapshot.context_id ?? null,
    end_time: snapshot.end_time ?? null,
    evaluation_id: snapshot.evaluation_id ?? null,
    is_completed: snapshot.is_completed ?? snapshot.status === "done",
    lesson_from: snapshot.lesson_from ?? null,
    lesson_to: snapshot.lesson_to ?? null,
    locked: snapshot.locked ?? false,
    move_count: snapshot.move_count ?? 0,
    notes: snapshot.notes ?? null,
    original_date: snapshot.original_date ?? null,
    original_time: snapshot.original_time ?? null,
    source: snapshot.source ?? "manual",
    status: snapshot.status ?? "planned",
    version,
  };
}

function applyEventValues(
  event: StudyEvent,
  values: PlanChangeEventValues,
  version: number,
): StudyEvent {
  const next: StudyEvent = { ...event, ...values, version };
  if (values.status !== undefined) {
    next.is_completed = values.status === "done";
    next.completed_at = values.status === "done" ? event.completed_at ?? new Date().toISOString() : null;
  }
  return next;
}

function restoreValues(snapshot: PlanChangeSnapshot): PlanChangeEventValues {
  const values: PlanChangeEventValues = {};
  for (const field of PLAN_EVENT_FIELDS) {
    const value = snapshot[field];
    if (value !== undefined) Object.assign(values, { [field]: value });
  }
  return values;
}

function eventMatchesInsert(event: StudyEvent, after: PlanChangeEventValues): boolean {
  const date = typeof after.event_date === "string" ? after.event_date.slice(0, 10) : null;
  return event.event_type === "study"
    && event.event_date.slice(0, 10) === date
    && (event.event_time ?? null) === (after.event_time ?? null)
    && (event.end_time ?? null) === (after.end_time ?? null)
    && (event.context_id ?? null) === (after.context_id ?? null)
    && (event.lesson_from ?? null) === (after.lesson_from ?? null)
    && (event.lesson_to ?? null) === (after.lesson_to ?? null)
    && event.subject === after.subject
    && event.title === after.title
    && (after.source === undefined || event.source === after.source);
}

function inversePlanChanges(
  changes: PlanChange[],
  beforeEvents: StudyEvent[],
  afterEvents: StudyEvent[],
  latestEvents: StudyEvent[],
): PlanChange[] {
  const previouslyPresent = new Set(beforeEvents.map((event) => event.id));
  const remainingLatest = [...latestEvents];
  const inverse: PlanChange[] = [];

  for (const change of [...changes].reverse()) {
    if (change.op === "update") {
      if (!change.before) throw new UndoTargetUnavailableError();
      const cached = latestEvents.find((event) => event.id === change.event_id);
      const fallback = eventFromSnapshot(change.before, change.event_id, change.version);
      const versionAfterAction = afterEvents.find((event) => event.id === change.event_id)?.version;
      const expectedVersion = versionAfterAction != null && versionAfterAction > change.version
        ? versionAfterAction
        : change.version + 1;
      if (cached?.version != null && cached.version > expectedVersion) throw new UndoTargetUnavailableError();
      const afterState = applyEventValues(cached ?? fallback, change.after, expectedVersion);
      inverse.push({
        op: "update",
        event_id: change.event_id,
        version: expectedVersion,
        before: snapshotForEvent(afterState),
        after: restoreValues(change.before),
      });
      continue;
    }

    if (change.op === "insert") {
      const matches = remainingLatest.filter((event) =>
        !previouslyPresent.has(event.id) && eventMatchesInsert(event, change.after),
      );
      if (matches.length !== 1) throw new UndoTargetUnavailableError();
      const [inserted] = matches;
      const insertedAfterAction = afterEvents.find((event) => event.id === inserted.id);
      if (!insertedAfterAction || (inserted.version ?? 0) > (insertedAfterAction.version ?? 0)) {
        throw new UndoTargetUnavailableError();
      }
      remainingLatest.splice(remainingLatest.indexOf(inserted), 1);
      inverse.push({
        op: "delete",
        event_id: inserted.id,
        version: insertedAfterAction.version ?? 0,
        before: snapshotForEvent(insertedAfterAction),
      });
      continue;
    }

    if (!change.before?.event_date || !change.before.subject || !change.before.title) {
      throw new UndoTargetUnavailableError();
    }
    inverse.push({
      op: "insert",
      after: {
        ...restoreValues(change.before),
        event_date: change.before.event_date,
        subject: change.before.subject,
        title: change.before.title,
      },
    });
  }

  return inverse;
}

function compactDuration(minutes: number, language: string): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (language.startsWith("en")) {
    if (hours && remainder) return `${hours} hr ${remainder} min`;
    if (hours) return `${hours} hr`;
    return `${remainder} min`;
  }
  if (hours && remainder) return `${hours} h ${remainder}`;
  if (hours) return `${hours} h`;
  return `${remainder} min`;
}

function isConflict(error: unknown): boolean {
  return error instanceof PlanConflictError
    || (error instanceof Error && (error.message === "version_conflict" || error.message === "undo_target_unavailable"));
}

export function SlotDoneMenu({ entry, slot }: SlotDoneMenuProps) {
  const queryClient = useContext(QueryClientContext);
  if (!queryClient) return null;
  return <ConnectedSlotDoneMenu entry={entry} slot={slot} />;
}

function ConnectedSlotDoneMenu({ entry, slot }: SlotDoneMenuProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { toast, dismiss } = useToast();
  const applyPlanChanges = useApplyPlanChanges();
  const toggleStudyEventCompleted = useToggleStudyEventCompleted();
  const toggleEvaluationCompleted = useToggleEvaluationCompleted();
  const inFlight = useRef(false);

  const sourceEvent = entry.original.kind === "studyEvent" ? entry.original.data : null;
  const replanSlot = toReplanSlot(entry);
  const lessonFrom = sourceEvent?.lesson_from ?? entry.lessonFrom ?? null;
  const lessonTo = sourceEvent?.lesson_to ?? entry.lessonTo ?? null;
  const hasLessonRange = sourceEvent?.event_type === "study"
    && lessonFrom != null
    && lessonTo != null
    && lessonTo >= lessonFrom;
  const totalLessons = hasLessonRange ? lessonTo - lessonFrom + 1 : 0;
  const isDone = entry.completed || entry.status === "done" || sourceEvent?.status === "done";
  const isSkipped = entry.status === "skipped" || sourceEvent?.status === "skipped";
  const isPending = applyPlanChanges.isPending
    || toggleStudyEventCompleted.isPending
    || toggleEvaluationCompleted.isPending;
  const title = slot.title || slot.subject || t("piano.type_study");
  const queryKey = studyEventsKeys.all(currentUser);

  const eventSnapshot = () => {
    const cached = queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [];
    if (sourceEvent && !cached.some((event) => event.id === sourceEvent.id)) return [...cached, sourceEvent];
    return cached;
  };

  const invalidateAfterConflict = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["evaluations"] }),
    ]);
  };

  const showConflict = async () => {
    await invalidateAfterConflict();
    toast({
      title: t("piano.slotPlanChanged"),
      description: t("piano.slotPlanChangedDesc"),
      duration: 10_000,
      "aria-live": "polite",
    });
  };

  const showActionError = (error: unknown) => {
    if (isConflict(error)) {
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
  };

  const undo = async (record: UndoRecord) => {
    try {
      if (record.kind === "evaluation") {
        await toggleEvaluationCompleted.mutateAsync({ id: record.id, next: record.completedBefore });
        return;
      }

      let latestEvents = queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [];
      if (record.changes.some((change) => change.op === "insert")) {
        let canFindEveryInsert = record.changes
          .filter((change) => change.op === "insert")
          .every((change) => latestEvents.filter((event) =>
            !record.eventsBefore.some((before) => before.id === event.id)
            && eventMatchesInsert(event, change.after),
          ).length === 1);
        if (!canFindEveryInsert) {
          await queryClient.invalidateQueries({ queryKey });
          latestEvents = queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [];
          canFindEveryInsert = record.changes
            .filter((change) => change.op === "insert")
            .every((change) => latestEvents.filter((event) =>
              !record.eventsBefore.some((before) => before.id === event.id)
              && eventMatchesInsert(event, change.after),
            ).length === 1);
        }
        if (!canFindEveryInsert) throw new UndoTargetUnavailableError();
      }

      const changes = inversePlanChanges(record.changes, record.eventsBefore, record.eventsAfter, latestEvents);
      await applyPlanChanges.mutateAsync({ reason: "manual", changes });
    } catch (error) {
      showActionError(error);
    }
  };

  const showUndoToast = (message: string, record: UndoRecord) => {
    const toastId: { current?: string } = {};
    const result = toast({
      title: message,
      // Radix pauses this 10 s countdown while the toast has focus.
      duration: 10_000,
      "aria-live": "polite",
      action: (
        <ToastAction
          altText={t("piano.slotUndo")}
          onClick={(event) => {
            event.preventDefault();
            void undo(record).finally(() => {
              if (toastId.current) dismiss(toastId.current);
            });
          }}
        >
          {t("piano.slotUndo")}
        </ToastAction>
      ),
    });
    toastId.current = result.id;
  };

  const runAction = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await action();
    } finally {
      inFlight.current = false;
    }
  };

  const doneToast = () => {
    if (slot.kind !== "study") return t("piano.slotDoneToast");
    const minutes = slot.a11ySummary?.durationMinutes ?? slot.durationMinutes;
    if (typeof minutes !== "number" || !Number.isFinite(minutes)) return t("piano.slotDoneToast");
    return t("piano.slotStudyDoneToast", { duration: compactDuration(minutes, i18n.resolvedLanguage ?? i18n.language) });
  };

  const completeRange = async (through: number) => {
    if (!replanSlot || !hasLessonRange || lessonFrom == null || lessonTo == null) return;
    const completedOrders = Array.from({ length: through - lessonFrom + 1 }, (_unused, index) => lessonFrom + index);
    const changes = splitPartial(replanSlot, completedOrders);
    if (!changes.length) return;
    const eventsBefore = eventSnapshot();
    try {
      await applyPlanChanges.mutateAsync({ reason: "manual", changes });
      const doneCount = through - lessonFrom + 1;
      const message = through < lessonTo
        ? t("piano.slotPartialToast", { done: doneCount, total: totalLessons })
        : doneToast();
      showUndoToast(message, {
        kind: "plan",
        changes,
        eventsBefore,
        eventsAfter: queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [],
      });
    } catch (error) {
      showActionError(error);
    }
  };

  const completeOne = async () => {
    if (isDone) return;
    if (entry.original.kind === "evaluation") {
      const completedBefore = !!entry.original.data.is_completed;
      try {
        await toggleEvaluationCompleted.mutateAsync({ id: entry.original.data.id, next: true });
        showUndoToast(t("piano.slotDoneToast"), {
          kind: "evaluation",
          id: entry.original.data.id,
          completedBefore,
        });
      } catch (error) {
        showActionError(error);
      }
      return;
    }

    if (!sourceEvent) return;
    if (hasLessonRange && lessonTo != null) {
      await completeRange(lessonTo);
      return;
    }

    const original = replanSlot;
    if (!original) return;
    const change: PlanChange = {
      op: "update",
      event_id: original.id,
      version: original.version,
      before: snapshotForSlot(original),
      after: { status: "done" },
    };
    const eventsBefore = eventSnapshot();
    try {
      await toggleStudyEventCompleted.mutateAsync({ id: original.id, next: true, version: original.version });
      showUndoToast(doneToast(), {
        kind: "plan",
        changes: [change],
        eventsBefore,
        eventsAfter: queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [],
      });
    } catch (error) {
      showActionError(error);
    }
  };

  const skip = async () => {
    if (!replanSlot || !sourceEvent || isSkipped) return;
    const changes: PlanChange[] = [{
      op: "update",
      event_id: replanSlot.id,
      version: replanSlot.version,
      before: snapshotForSlot(replanSlot),
      after: { status: "skipped" },
    }];
    await runAction(async () => {
      const eventsBefore = eventSnapshot();
      try {
        await applyPlanChanges.mutateAsync({ reason: "skip", changes });
        showUndoToast(t("piano.slotSkippedToast"), {
          kind: "plan",
          changes,
          eventsBefore,
          eventsAfter: queryClient.getQueryData<StudyEvent[]>(queryKey) ?? [],
        });
      } catch (error) {
        showActionError(error);
      }
    });
  };

  const supportsSkip = !!sourceEvent && !!replanSlot;
  const hasAvailableAction = !isDone;
  const partialOrders = hasLessonRange && lessonFrom != null && lessonTo != null
    ? Array.from({ length: Math.max(0, lessonTo - lessonFrom) }, (_unused, index) => lessonFrom + index)
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          aria-label={t("piano.slotActionsLabel", { title })}
          title={t("piano.slotActionsLabel", { title })}
          disabled={isPending || !hasAvailableAction}
          data-haptic="medium"
        >
          <Check aria-hidden="true" />
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {hasLessonRange ? (
          <>
            <DropdownMenuItem disabled={isDone} onSelect={() => { void runAction(() => completeRange(lessonTo!)); }}>
              {t("piano.slotCompleteAll", { count: totalLessons })}
            </DropdownMenuItem>
            {partialOrders.map((order) => (
              <DropdownMenuItem key={order} disabled={isDone} onSelect={() => { void runAction(() => completeRange(order)); }}>
                {t("piano.slotCompleteThrough", { lesson: order + 1 })}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <DropdownMenuItem disabled={isDone} onSelect={() => { void runAction(completeOne); }}>
            {t("piano.slotMarkDone")}
          </DropdownMenuItem>
        )}
        {supportsSkip && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isSkipped || isDone} onSelect={() => { void skip(); }}>
              <SkipForward className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("piano.slotSkip")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
