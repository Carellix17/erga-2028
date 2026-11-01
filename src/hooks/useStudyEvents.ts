import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import type {
  PlanChange,
  PlanChangeReason,
  StudyEventSource,
  StudyEventStatus,
} from "@/lib/planner/types";
import { useTrackedMutation } from "./useTrackedMutation";

export interface StudyEvent {
  id: string;
  subject: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  event_type: "test" | "assignment" | "study";
  completed_at?: string | null;
  context_id?: string | null;
  end_time?: string | null;
  evaluation_id?: string | null;
  is_completed?: boolean;
  lesson_from?: number | null;
  lesson_to?: number | null;
  locked?: boolean;
  move_count?: number;
  notes?: string | null;
  original_date?: string | null;
  original_time?: string | null;
  source?: StudyEventSource;
  status?: StudyEventStatus;
  updated_at?: string;
  version?: number;
}

export const studyEventsKeys = {
  all: (userId: string | null) => ["study-events", userId] as const,
};

export class PlanConflictError extends Error {
  constructor() {
    super("version_conflict");
    this.name = "PlanConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function normalizePlanError(error: unknown): Error {
  if (error instanceof PlanConflictError) return error;
  if (error instanceof Error && error.message === "version_conflict") return new PlanConflictError();
  return error instanceof Error ? error : new Error(String(error));
}

async function saveEvent<T = unknown>(body: Record<string, unknown>): Promise<T> {
  try {
    return await edgeFetch<T>("save-event", body);
  } catch (error) {
    throw normalizePlanError(error);
  }
}

export function useStudyEventsQuery(enabled: boolean) {
  const { currentUser } = useAuth();
  return useQuery<StudyEvent[]>({
    queryKey: studyEventsKeys.all(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ events?: StudyEvent[] }>("save-event", {
        userId: currentUser,
        action: "list",
      });
      return data.events ?? [];
    },
    enabled: enabled && !!currentUser,
  });
}

export interface AddStudyEventInput {
  subject: string;
  title: string;
  date: string;
  time?: string | null;
  type: "test" | "assignment" | "study";
  notes?: string;
  endTime?: string;
  contextId?: string;
  evaluationId?: string;
  source?: StudyEventSource;
  status?: StudyEventStatus;
  lessonFrom?: number;
  lessonTo?: number;
}

export function useAddStudyEvents() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, AddStudyEventInput[]>({
    mutationFn: (events) =>
      edgeFetch("save-event", { userId: currentUser, action: "add", events }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export function useDeleteStudyEvent() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, string, { previous?: StudyEvent[] }>({
    mutationFn: (eventId) =>
      edgeFetch("save-event", { userId: currentUser, action: "delete", events: [eventId] }),
    onMutate: async (eventId) => {
      const qk = studyEventsKeys.all(currentUser);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<StudyEvent[]>(qk);
      if (previous) {
        qc.setQueryData<StudyEvent[]>(qk, previous.filter((event) => event.id !== eventId));
      }
      return { previous };
    },
    onError: (_error, _eventId, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(studyEventsKeys.all(currentUser), context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export interface UpdateStudyEventInput {
  id: string;
  version?: number;
  subject?: string;
  title?: string;
  date?: string;
  time?: string | null;
  type?: "test" | "assignment" | "study";
  notes?: string;
  endTime?: string;
  completed?: boolean;
  status?: StudyEventStatus;
  lessonFrom?: number;
  lessonTo?: number;
  locked?: boolean;
}

/** Resolves versions for existing callers that only pass the selected event's id. */
export function withStudyEventVersion(
  event: UpdateStudyEventInput,
  cachedVersion?: number,
): UpdateStudyEventInput & { version: number } {
  const version = event.version ?? cachedVersion;
  if (!Number.isInteger(version) || (version as number) < 0) {
    throw new Error("version_required");
  }
  return { ...event, version: version as number };
}

function hasValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function applyCompleted(event: StudyEvent, completed: boolean): StudyEvent {
  return {
    ...event,
    status: completed ? "done" : "planned",
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
}

function applyOptimisticUpdate(event: StudyEvent, update: UpdateStudyEventInput): StudyEvent {
  const next: StudyEvent = { ...event };
  if (update.subject !== undefined) next.subject = update.subject;
  if (update.title !== undefined) next.title = update.title;
  if (update.date !== undefined) next.event_date = update.date;
  if (update.time !== undefined) next.event_time = update.time;
  if (update.type !== undefined) next.event_type = update.type;

  if (typeof update.notes === "string") {
    const notes = update.notes.trim();
    if (notes) next.notes = notes.slice(0, 1000);
  }
  if (typeof update.endTime === "string" && hasValidTime(update.endTime)) {
    const startProvided = update.time !== undefined && update.time !== null;
    const startTime = typeof update.time === "string" && hasValidTime(update.time) ? update.time : undefined;
    if (!startProvided || (startTime !== undefined && update.endTime > startTime)) {
      next.end_time = update.endTime;
    }
  }
  if (Number.isInteger(update.lessonFrom) && Number.isInteger(update.lessonTo)
    && (update.lessonFrom as number) >= 0
    && (update.lessonTo as number) >= (update.lessonFrom as number)) {
    next.lesson_from = update.lessonFrom;
    next.lesson_to = update.lessonTo;
  }
  if (update.status !== undefined) {
    next.status = update.status;
    if (update.status === "done") next.is_completed = true;
  }
  if (update.locked !== undefined) next.locked = update.locked;
  if (update.completed !== undefined) return applyCompleted(next, update.completed);
  return next;
}

export function useUpdateStudyEvent() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const queryKey = studyEventsKeys.all(currentUser);
  return useTrackedMutation<unknown, Error, UpdateStudyEventInput, { previous?: StudyEvent[] }>({
    mutationFn: (event) => {
      const cached = qc.getQueryData<StudyEvent[]>(queryKey)?.find((item) => item.id === event.id);
      const versionedEvent = withStudyEventVersion(event, cached?.version);
      return saveEvent({ userId: currentUser, action: "update", event: versionedEvent });
    },
    onMutate: async (event) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<StudyEvent[]>(queryKey);
      if (previous) {
        qc.setQueryData<StudyEvent[]>(
          queryKey,
          previous.map((item) => item.id === event.id ? applyOptimisticUpdate(item, event) : item),
        );
      }
      return { previous };
    },
    onError: (_error, _event, context) => {
      if (context?.previous !== undefined) qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export interface ToggleStudyEventCompletedInput {
  id: string;
  next: boolean;
  version?: number;
}

export function useToggleStudyEventCompleted() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const queryKey = studyEventsKeys.all(currentUser);
  return useTrackedMutation<unknown, Error, ToggleStudyEventCompletedInput, { previous?: StudyEvent[] }>({
    mutationFn: (input) => {
      const cached = qc.getQueryData<StudyEvent[]>(queryKey)?.find((item) => item.id === input.id);
      const { version } = withStudyEventVersion({ id: input.id, version: input.version }, cached?.version);
      return saveEvent({
        userId: currentUser,
        action: "update",
        event: { id: input.id, version, completed: input.next },
      });
    },
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<StudyEvent[]>(queryKey);
      if (previous) {
        qc.setQueryData<StudyEvent[]>(
          queryKey,
          previous.map((event) => event.id === id ? applyCompleted(event, next) : event),
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export interface ApplyPlanChangesInput {
  reason: PlanChangeReason;
  changes: PlanChange[];
}

export interface ApplyPlanChangesResult {
  packageId: string;
}

export function useApplyPlanChanges() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const queryKey = studyEventsKeys.all(currentUser);
  return useTrackedMutation<ApplyPlanChangesResult, Error, ApplyPlanChangesInput>({
    mutationFn: ({ reason, changes }) => saveEvent<ApplyPlanChangesResult>({
      userId: currentUser,
      action: "applyChanges",
      reason,
      changes,
    }),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useDeleteStudyEventsByType() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, "study" | "test" | "assignment">({
    mutationFn: (eventType) =>
      edgeFetch("save-event", { userId: currentUser, action: "deleteByType", eventType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export function useDeleteAllStudyEvents() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, void>({
    mutationFn: () =>
      edgeFetch("save-event", { userId: currentUser, action: "deleteAll" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}
