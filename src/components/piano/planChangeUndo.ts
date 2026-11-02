import type { PlanChange, PlanChangeEventValues, PlanChangeSnapshot } from "@/lib/planner/types";
import type { StudyEvent } from "@/hooks/useStudyEvents";

const EVENT_FIELDS = [
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

export class UndoTargetUnavailableError extends Error {
  constructor() {
    super("undo_target_unavailable");
    this.name = "UndoTargetUnavailableError";
  }
}

export class UndoCompletedSlotError extends Error {
  readonly slotTitle: string;

  constructor(slotTitle: string) {
    super("undo_slot_completed");
    this.name = "UndoCompletedSlotError";
    this.slotTitle = slotTitle;
  }
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

function applyEventValues(event: StudyEvent, values: PlanChangeEventValues, version: number): StudyEvent {
  const next: StudyEvent = { ...event, ...values, version };
  if (values.status !== undefined) {
    next.is_completed = values.status === "done";
    next.completed_at = values.status === "done" ? event.completed_at ?? new Date().toISOString() : null;
  }
  return next;
}

function restoreValues(snapshot: PlanChangeSnapshot): PlanChangeEventValues {
  const values: PlanChangeEventValues = {};
  for (const field of EVENT_FIELDS) {
    const value = snapshot[field];
    if (value !== undefined) Object.assign(values, { [field]: value });
  }
  return values;
}

export function eventMatchesInsert(event: StudyEvent, after: PlanChangeEventValues): boolean {
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

function isCompleted(event: StudyEvent): boolean {
  return event.status === "done" || event.is_completed === true;
}

/** Returns the inverse package, after verifying current versions and targets. */
export function createInversePlanChanges(
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
      if (!cached) throw new UndoTargetUnavailableError();
      if (isCompleted(cached)) throw new UndoCompletedSlotError(cached.title || cached.subject || cached.id);

      const versionAfterAction = afterEvents.find((event) => event.id === change.event_id)?.version;
      const expectedVersion = versionAfterAction != null && versionAfterAction > change.version
        ? versionAfterAction
        : change.version + 1;
      if ((cached.version ?? 0) > expectedVersion) throw new UndoTargetUnavailableError();
      const afterState = applyEventValues(cached, change.after, expectedVersion);
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
      if (isCompleted(inserted)) throw new UndoCompletedSlotError(inserted.title || inserted.subject || inserted.id);
      const insertedAfterAction = afterEvents.find((event) => event.id === inserted.id) ?? inserted;
      if ((inserted.version ?? 0) > (insertedAfterAction.version ?? 0)) throw new UndoTargetUnavailableError();
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
