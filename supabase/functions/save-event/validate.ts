export const STUDY_EVENT_STATUSES = ["planned", "done", "partial", "skipped"] as const;
export const STUDY_EVENT_SOURCES = ["manual", "auto", "replan", "ai"] as const;
export const PLAN_CHANGE_REASONS = [
  "skip",
  "overrun",
  "faster",
  "deadline",
  "routine",
  "ai",
  "manual",
  "generate",
] as const;

export type StudyEventStatus = (typeof STUDY_EVENT_STATUSES)[number];
export type StudyEventSource = (typeof STUDY_EVENT_SOURCES)[number];
export type PlanChangeReason = (typeof PLAN_CHANGE_REASONS)[number];

export interface ValidatedStudyEventFields {
  notes?: string;
  end_time?: string;
  context_id?: string;
  evaluation_id?: string;
  source?: StudyEventSource;
  status?: StudyEventStatus;
  lesson_from?: number;
  lesson_to?: number;
}

export type ValidatedPlanChange = Record<string, unknown>;

export type PlanChangesValidation =
  | { ok: true; changes: ValidatedPlanChange[] }
  | { ok: false; error: "changes_invalid" | "changes_limit" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRICT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COMPARABLE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_PLAN_CHANGES = 100;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function isStrictTime(value: unknown): value is string {
  return typeof value === "string" && STRICT_TIME_PATTERN.test(value);
}

function comparableTime(value: unknown): string | undefined {
  if (typeof value !== "string" || !COMPARABLE_TIME_PATTERN.test(value)) return undefined;
  return value.slice(0, 5);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isStudyEventStatus(value: unknown): value is StudyEventStatus {
  return typeof value === "string" && (STUDY_EVENT_STATUSES as readonly string[]).includes(value.trim());
}

function isStudyEventSource(value: unknown): value is StudyEventSource {
  return typeof value === "string" && (STUDY_EVENT_SOURCES as readonly string[]).includes(value.trim());
}

export function isPlanChangeReason(value: unknown): value is PlanChangeReason {
  return typeof value === "string" && (PLAN_CHANGE_REASONS as readonly string[]).includes(value);
}

/**
 * Validates only the optional fields added to study_events. Invalid values are
 * omitted independently so a bad optional value never blocks a valid insert.
 * Input uses the Edge Function's camelCase payload names; output is DB-shaped.
 */
export function validateStudyEventFields(event: UnknownRecord): ValidatedStudyEventFields {
  const fields: ValidatedStudyEventFields = {};

  if (typeof event.notes === "string") {
    const notes = event.notes.trim();
    if (notes.length > 0) fields.notes = notes.slice(0, 1000);
  }

  if (isStrictTime(event.endTime)) {
    const startWasProvided = event.time !== undefined && event.time !== null;
    const startTime = comparableTime(event.time);
    if (!startWasProvided || (startTime !== undefined && event.endTime > startTime)) {
      fields.end_time = event.endTime;
    }
  }

  if (isUuid(event.contextId)) fields.context_id = event.contextId.trim().toLowerCase();
  if (isUuid(event.evaluationId)) fields.evaluation_id = event.evaluationId.trim().toLowerCase();

  if (isStudyEventSource(event.source)) fields.source = event.source.trim() as StudyEventSource;
  if (isStudyEventStatus(event.status)) fields.status = event.status.trim() as StudyEventStatus;

  const fromAbsent = event.lessonFrom === undefined || event.lessonFrom === null;
  const toAbsent = event.lessonTo === undefined || event.lessonTo === null;
  if (!fromAbsent && !toAbsent
    && isNonNegativeInteger(event.lessonFrom)
    && isNonNegativeInteger(event.lessonTo)
    && event.lessonTo >= event.lessonFrom) {
    fields.lesson_from = event.lessonFrom;
    fields.lesson_to = event.lessonTo;
  }

  return fields;
}

/** Builds the legacy add payload without leaking client-only or server-owned fields. */
export function buildStudyEventInsert(userId: string, event: UnknownRecord): UnknownRecord {
  return {
    user_id: userId,
    subject: event.subject,
    title: event.title,
    event_date: event.date,
    event_time: event.time || null,
    event_type: event.type,
    ...validateStudyEventFields(event),
  };
}

export type StudyEventUpdateBuildResult =
  | { ok: true; id: string; version: number; data: Record<string, unknown> }
  | {
      ok: false;
      status: 400;
      error: "version_required" | "Missing event id" | "Nessuna modifica valida";
    };

/** Builds a validated, version-aware update patch without I/O or side effects. */
export function buildStudyEventUpdate(event: UnknownRecord, nowIso: string): StudyEventUpdateBuildResult {
  const id = typeof event.id === "string" ? event.id.trim() : "";
  if (!id) return { ok: false, status: 400, error: "Missing event id" };
  if (typeof event.version !== "number" || !Number.isInteger(event.version) || event.version < 0) {
    return { ok: false, status: 400, error: "version_required" };
  }

  const allowedTypes = ["study", "test", "assignment"];
  const data: Record<string, unknown> = {};
  if (typeof event.subject === "string" && event.subject.trim()) data.subject = event.subject.trim().slice(0, 80);
  if (typeof event.title === "string" && event.title.trim()) data.title = event.title.trim().slice(0, 200);
  if (typeof event.date === "string" && !Number.isNaN(Date.parse(event.date))) data.event_date = event.date;
  if (typeof event.time === "string" && /^\d{2}:\d{2}$/.test(event.time)) data.event_time = event.time;
  if (event.time === null) data.event_time = null;
  if (typeof event.type === "string" && allowedTypes.includes(event.type)) data.event_type = event.type;

  const fields = validateStudyEventFields(event);
  if (fields.notes !== undefined) data.notes = fields.notes;
  if (fields.end_time !== undefined) data.end_time = fields.end_time;
  if (fields.lesson_from !== undefined && fields.lesson_to !== undefined) {
    data.lesson_from = fields.lesson_from;
    data.lesson_to = fields.lesson_to;
  }
  if (fields.status !== undefined) {
    data.status = fields.status;
    const completed = fields.status === "done";
    data.is_completed = completed;
    data.completed_at = completed ? nowIso : null;
  }
  if (typeof event.locked === "boolean") data.locked = event.locked;

  // Explicit completion takes precedence over a simultaneous status field.
  if (typeof event.completed === "boolean") {
    data.status = event.completed ? "done" : "planned";
    data.is_completed = event.completed;
    data.completed_at = event.completed ? nowIso : null;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, status: 400, error: "Nessuna modifica valida" };
  }
  return { ok: true, id, version: event.version, data };
}

const SNAPSHOT_KEYS = [
  "subject",
  "title",
  "event_date",
  "event_time",
  "end_time",
  "event_type",
  "context_id",
  "evaluation_id",
  "lesson_from",
  "lesson_to",
  "notes",
  "source",
  "status",
  "move_count",
  "original_date",
  "original_time",
  "locked",
  "is_completed",
  "completed_at",
  "version",
] as const;

function sanitizeSnapshot(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;
  const snapshot: UnknownRecord = {};
  for (const key of SNAPSHOT_KEYS) {
    const field = value[key];
    if (field === null || typeof field === "boolean") {
      snapshot[key] = field;
    } else if (typeof field === "string") {
      snapshot[key] = field.slice(0, 1000);
    } else if (typeof field === "number" && Number.isFinite(field)) {
      snapshot[key] = field;
    }
  }
  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

function normalizeNullableTime(
  value: unknown,
  strict = false,
): { valid: true; value: string | null } | { valid: false } {
  if (value === null) return { valid: true, value: null };
  if (strict ? isStrictTime(value) : comparableTime(value) !== undefined) {
    return { valid: true, value: value as string };
  }
  return { valid: false };
}

function normalizeLessonRange(after: UnknownRecord, output: UnknownRecord): void {
  const fromProvided = hasOwn(after, "lesson_from") && after.lesson_from !== undefined;
  const toProvided = hasOwn(after, "lesson_to") && after.lesson_to !== undefined;
  if (!fromProvided && !toProvided) return;

  if (after.lesson_from === null && after.lesson_to === null) {
    output.lesson_from = null;
    output.lesson_to = null;
    return;
  }

  if (isNonNegativeInteger(after.lesson_from)
    && isNonNegativeInteger(after.lesson_to)
    && after.lesson_to >= after.lesson_from) {
    output.lesson_from = after.lesson_from;
    output.lesson_to = after.lesson_to;
  }
}

function sanitizeEventTimes(after: UnknownRecord, output: UnknownRecord): void {
  const eventTimeProvided = hasOwn(after, "event_time") && after.event_time !== undefined;
  let startTime: string | undefined;
  let invalidStartTime = false;

  if (eventTimeProvided) {
    const normalized = normalizeNullableTime(after.event_time);
    if (normalized.valid) {
      output.event_time = normalized.value;
      if (typeof normalized.value === "string") startTime = normalized.value.slice(0, 5);
    } else {
      invalidStartTime = true;
    }
  }

  if (hasOwn(after, "end_time") && after.end_time !== undefined) {
    if (after.end_time === null) {
      output.end_time = null;
    } else if (isStrictTime(after.end_time)
      && !invalidStartTime
      && (startTime === undefined || after.end_time > startTime)) {
      output.end_time = after.end_time;
    }
  }
}

function sanitizeInsertAfter(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.subject !== "string" || !value.subject.trim()) return undefined;
  if (typeof value.title !== "string" || !value.title.trim()) return undefined;
  if (!isDate(value.event_date)) return undefined;

  const after: UnknownRecord = {
    subject: value.subject.trim().slice(0, 80),
    title: value.title.trim().slice(0, 200),
    event_date: value.event_date,
  };
  sanitizeEventTimes(value, after);
  normalizeLessonRange(value, after);

  for (const key of ["context_id", "evaluation_id"] as const) {
    const field = value[key];
    if (field === null) after[key] = null;
    else if (isUuid(field)) after[key] = field.trim().toLowerCase();
  }

  if (isStudyEventSource(value.source)) after.source = value.source.trim();
  return after;
}

function sanitizeUpdateAfter(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;
  const after: UnknownRecord = {};

  if (isDate(value.event_date)) after.event_date = value.event_date;
  sanitizeEventTimes(value, after);
  normalizeLessonRange(value, after);

  if (isStudyEventStatus(value.status)) after.status = value.status.trim();
  if (isNonNegativeInteger(value.move_count)) after.move_count = value.move_count;
  if (value.original_date === null) after.original_date = null;
  else if (isDate(value.original_date)) after.original_date = value.original_date;
  if (value.original_time === null) after.original_time = null;
  else if (isStrictTime(value.original_time)) after.original_time = value.original_time;
  if (isStudyEventSource(value.source)) after.source = value.source.trim();

  return Object.keys(after).length > 0 ? after : undefined;
}

function validatePlanChange(value: unknown): ValidatedPlanChange | undefined {
  if (!isRecord(value)) return undefined;
  const before = sanitizeSnapshot(value.before);
  const metadata = before ? { before } : {};

  if (value.op === "insert") {
    const after = sanitizeInsertAfter(value.after);
    return after ? { op: "insert", ...metadata, after } : undefined;
  }

  if ((value.op === "update" || value.op === "delete")
    && isUuid(value.event_id)
    && isNonNegativeInteger(value.version)) {
    if (value.op === "delete") {
      return { op: "delete", ...metadata, event_id: value.event_id.trim().toLowerCase(), version: value.version };
    }
    const after = sanitizeUpdateAfter(value.after);
    return after
      ? { op: "update", ...metadata, event_id: value.event_id.trim().toLowerCase(), version: value.version, after }
      : undefined;
  }

  return undefined;
}

/** Validates and bounds the RPC batch before it is sent to the database. */
export function validatePlanChanges(value: unknown): PlanChangesValidation {
  if (!Array.isArray(value) || value.length === 0) return { ok: false, error: "changes_invalid" };
  if (value.length > MAX_PLAN_CHANGES) return { ok: false, error: "changes_limit" };

  const changes: ValidatedPlanChange[] = [];
  for (const change of value) {
    const validated = validatePlanChange(change);
    if (!validated) return { ok: false, error: "changes_invalid" };
    changes.push(validated);
  }
  return { ok: true, changes };
}
