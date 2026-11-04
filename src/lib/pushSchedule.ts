import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";
import type { StudyEvent } from "@/hooks/useStudyEvents";

const TIME_ZONE = "Europe/Rome";
const MAX_SLOT_REMINDERS_PER_DAY = 5;
const MAX_LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000;
const REMINDER_LEAD_MS = 5 * 60 * 1000;

type ScheduledPushInsert = Database["public"]["Tables"]["scheduled_pushes"]["Insert"];
type NotifyKind = "pomodoro" | "overrun" | "slot_start" | "evening_summary";

export interface TimerReminderSession {
  id: string | null;
  userId: string;
  phase: "focus" | "short" | "long";
  cycle: number;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  nextBreakMinutes?: number;
  pausedAt: number | null;
  task: {
    subject?: string;
    eventId?: string;
    lessonFrom?: number | null;
    lessonTo?: number | null;
  };
}

export interface ExistingScheduledPush {
  id: string;
  kind: string;
  tag: string | null;
  send_at: string;
  title: string;
  body: string;
  url: string;
  sent_at: string | null;
  cancelled_at: string | null;
  skip_reason: string | null;
}

export interface PushScheduleStore {
  listManaged: (userId: string) => Promise<readonly ExistingScheduledPush[]>;
  cancelPending: (userId: string, ids: readonly string[], cancelledAt: string) => Promise<void>;
  cancelForSession: (userId: string, sessionId: string, cancelledAt: string) => Promise<void>;
  insert: (userId: string, rows: readonly ScheduledPushInsert[]) => Promise<void>;
}

export interface EnqueueSlotOptions {
  userId: string;
  notifyTypes: unknown;
  store?: PushScheduleStore;
  now?: Date;
  language?: string;
}

function notifyTypesRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function isNotifyTypeEnabled(notifyTypes: unknown, kind: NotifyKind): boolean {
  const value = notifyTypesRecord(notifyTypes)[kind];
  return typeof value === "boolean" ? value : true;
}

export function hideSubjectEnabled(notifyTypes: unknown): boolean {
  return notifyTypesRecord(notifyTypes).hide_subject === true;
}

function translation(key: string, values: Record<string, string | number>, language?: string): string {
  return i18n.t(key, { ...values, ...(language ? { lng: language } : {}) });
}

function cleanText(value: string, limit: number): string {
  const points = Array.from(value);
  return points.length <= limit ? value : points.slice(0, limit).join("");
}

function partsInRome(value: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, ...options })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function romeDateKey(value: Date): string {
  const parts = partsInRome(value, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function wallTimeParts(value: Date): Record<string, string> {
  return partsInRome(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function localDateTimeToTimestamp(date: string, time: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const [year, month, day] = dateMatch.slice(1).map(Number);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;

  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = wallTimeAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = wallTimeParts(new Date(candidate));
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const difference = wallTimeAsUtc - representedAsUtc;
    if (difference === 0) return candidate;
    candidate += difference;
  }
  // A local clock time skipped by the spring DST change has no corresponding instant.
  return null;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "--:--";
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? "--:--";
}

function eventStart(event: StudyEvent): number | null {
  if (!event.event_time) return null;
  return localDateTimeToTimestamp(event.event_date.slice(0, 10), event.event_time);
}

function lessonRange(event: StudyEvent): { from: number; to: number } {
  const firstIndex = Number.isInteger(event.lesson_from) && (event.lesson_from as number) >= 0
    ? event.lesson_from as number
    : 0;
  const lastIndex = Number.isInteger(event.lesson_to) && (event.lesson_to as number) >= firstIndex
    ? event.lesson_to as number
    : firstIndex;
  return { from: firstIndex + 1, to: lastIndex + 1 };
}

function normalizedLanguage(language?: string): "it" | "en" {
  const current = (language ?? i18n.resolvedLanguage ?? i18n.language ?? "it").slice(0, 2).toLowerCase();
  return current === "en" ? "en" : "it";
}

function internalPlanUrl(eventId?: string, language?: string): string {
  const params = new URLSearchParams({ tab: "piano", lang: normalizedLanguage(language) });
  if (eventId) params.set("slot", eventId);
  return `/app?${params.toString()}`;
}

function makeSlotReminder(
  event: StudyEvent,
  userId: string,
  notifyTypes: unknown,
  language?: string,
): ScheduledPushInsert {
  const subject = event.subject?.trim() || translation("focusTimer.defaultSubject", {}, language);
  const { from, to } = lessonRange(event);
  const values = {
    subject,
    from,
    to,
    start: formatTime(event.event_time),
    end: formatTime(event.end_time),
  };
  const hidden = hideSubjectEnabled(notifyTypes);
  const title = translation(`pushSchedule.slotStart.title${hidden ? "Private" : ""}`, values, language);
  const body = translation(`pushSchedule.slotStart.body${hidden ? "Private" : ""}`, values, language);
  const tag = cleanText(`erga-slot-${event.id}`, 64);
  return {
    user_id: userId,
    kind: "slot_start",
    send_at: "",
    title: cleanText(title, 80),
    body: cleanText(body, 160),
    url: internalPlanUrl(event.id, language),
    tag,
    focus_session_id: null,
  };
}

function movedToday(events: readonly StudyEvent[], today: string): StudyEvent[] {
  return events.filter((event) => {
    const differsFromOriginal = !!event.original_date
      && (event.original_date !== event.event_date || (event.original_time ?? null) !== (event.event_time ?? null));
    if (
      event.event_type !== "study"
      || event.is_completed === true
      || event.status !== "planned"
      || (event.move_count ?? 0) < 1
      || !differsFromOriginal
      || !event.updated_at
    ) return false;
    const updatedAt = new Date(event.updated_at);
    return Number.isFinite(updatedAt.getTime()) && romeDateKey(updatedAt) === today;
  });
}

function makeEveningSummary(
  moved: readonly StudyEvent[],
  userId: string,
  notifyTypes: unknown,
  dayKey: string,
  sendAt: Date,
  language?: string,
): ScheduledPushInsert {
  const hidden = hideSubjectEnabled(notifyTypes);
  const items = moved
    .slice()
    .sort((left, right) => (left.event_time ?? "").localeCompare(right.event_time ?? ""))
    .slice(0, 8)
    .map((event) => translation("pushSchedule.eveningSummary.item", {
      subject: event.subject?.trim() || translation("focusTimer.defaultSubject", {}, language),
      time: formatTime(event.event_time),
    }, language))
    .join(", ");
  const title = translation("pushSchedule.eveningSummary.title", {}, language);
  const body = translation(
    `pushSchedule.eveningSummary.body${hidden ? "Private" : ""}`,
    { count: moved.length, items },
    language,
  );
  return {
    user_id: userId,
    kind: "evening_summary",
    send_at: sendAt.toISOString(),
    title: cleanText(title, 80),
    body: cleanText(body, 160),
    url: internalPlanUrl(undefined, language),
    tag: `erga-evening-summary-${dayKey}`,
    focus_session_id: null,
  };
}

export function buildSlotReminderCandidates(
  events: readonly StudyEvent[],
  userId: string,
  notifyTypes: unknown,
  now: Date,
  language?: string,
): ScheduledPushInsert[] {
  if (!isNotifyTypeEnabled(notifyTypes, "slot_start")) return [];
  const horizon = now.getTime() + MAX_LOOKAHEAD_MS;
  const candidates = events.flatMap((event) => {
    if (
      event.event_type !== "study"
      || event.is_completed === true
      || event.status === "done"
      || event.status === "skipped"
    ) return [];
    const startAt = eventStart(event);
    if (startAt === null || startAt <= now.getTime() || startAt > horizon) return [];
    const sendAt = startAt - REMINDER_LEAD_MS;
    if (sendAt <= now.getTime()) return [];
    const row = makeSlotReminder(event, userId, notifyTypes, language);
    row.send_at = new Date(sendAt).toISOString();
    return [{ row, sendAt }];
  });
  return candidates
    .sort((left, right) => left.sendAt - right.sendAt || (left.row.tag ?? "").localeCompare(right.row.tag ?? ""))
    .map(({ row }) => row);
}

function activeSentSlotCounts(existing: readonly ExistingScheduledPush[]): {
  countByDay: Map<string, number>;
  sentTagsByDay: Map<string, Set<string>>;
} {
  const countByDay = new Map<string, number>();
  const sentTagsByDay = new Map<string, Set<string>>();
  for (const row of existing) {
    if (row.kind !== "slot_start" || !row.sent_at || row.skip_reason !== null || row.cancelled_at !== null) continue;
    const sentAt = new Date(row.sent_at);
    if (!Number.isFinite(sentAt.getTime())) continue;
    const day = romeDateKey(sentAt);
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
    if (row.tag) {
      const tags = sentTagsByDay.get(day) ?? new Set<string>();
      tags.add(row.tag);
      sentTagsByDay.set(day, tags);
    }
  }
  return { countByDay, sentTagsByDay };
}

function applySlotDailyCap(
  candidates: readonly ScheduledPushInsert[],
  existing: readonly ExistingScheduledPush[],
): ScheduledPushInsert[] {
  const { countByDay, sentTagsByDay } = activeSentSlotCounts(existing);
  const used = new Map(countByDay);
  const chosen: ScheduledPushInsert[] = [];
  for (const candidate of candidates) {
    const day = romeDateKey(new Date(candidate.send_at));
    const sentTags = sentTagsByDay.get(day);
    if (candidate.tag && sentTags?.has(candidate.tag)) continue;
    const count = used.get(day) ?? 0;
    if (count >= MAX_SLOT_REMINDERS_PER_DAY) continue;
    chosen.push(candidate);
    used.set(day, count + 1);
  }
  return chosen;
}

function sameSchedule(existing: ExistingScheduledPush, desired: ScheduledPushInsert): boolean {
  return existing.kind === desired.kind
    && existing.tag === (desired.tag ?? null)
    && existing.title === desired.title
    && existing.body === desired.body
    && existing.url === desired.url
    && Date.parse(existing.send_at) === Date.parse(desired.send_at);
}

function reconciliation(
  existing: readonly ExistingScheduledPush[],
  desired: readonly ScheduledPushInsert[],
): { cancelIds: string[]; insertRows: ScheduledPushInsert[] } {
  const keptIds = new Set<string>();
  const cancelIds = new Set<string>();
  const insertRows: ScheduledPushInsert[] = [];

  for (const row of desired) {
    const exact = existing.find((candidate) =>
      candidate.tag === (row.tag ?? null) && sameSchedule(candidate, row),
    );
    if (exact) {
      if (exact.sent_at === null) keptIds.add(exact.id);
      continue;
    }
    insertRows.push(row);
  }

  const desiredTags = new Set(desired.map((row) => row.tag ?? ""));
  for (const row of existing) {
    if (row.sent_at !== null) continue;
    if (!desiredTags.has(row.tag ?? "") || !keptIds.has(row.id)) cancelIds.add(row.id);
  }
  return { cancelIds: [...cancelIds], insertRows };
}

function addEveningSummary(
  desired: ScheduledPushInsert[],
  events: readonly StudyEvent[],
  userId: string,
  notifyTypes: unknown,
  now: Date,
  language?: string,
): void {
  if (!isNotifyTypeEnabled(notifyTypes, "evening_summary")) return;
  const today = romeDateKey(now);
  const moved = movedToday(events, today);
  if (!moved.length) return;
  const sendAt = localDateTimeToTimestamp(today, "20:30");
  if (sendAt === null || sendAt <= now.getTime()) return;
  desired.push(makeEveningSummary(moved, userId, notifyTypes, today, new Date(sendAt), language));
}

async function synchronizeSlotReminders(
  events: readonly StudyEvent[],
  options: EnqueueSlotOptions,
): Promise<void> {
  const store = options.store ?? supabasePushScheduleStore;
  const now = options.now ?? new Date();
  const existing = await store.listManaged(options.userId);
  const desired = buildSlotReminderCandidates(
    events,
    options.userId,
    options.notifyTypes,
    now,
    options.language,
  );
  const capped = applySlotDailyCap(desired, existing);
  addEveningSummary(capped, events, options.userId, options.notifyTypes, now, options.language);

  const changes = reconciliation(existing, capped);
  if (changes.cancelIds.length) {
    await store.cancelPending(options.userId, changes.cancelIds, now.toISOString());
  }
  if (changes.insertRows.length) await store.insert(options.userId, changes.insertRows);
}

const slotSyncQueues = new Map<string, Promise<void>>();

export function enqueueSlotReminders(
  events: readonly StudyEvent[],
  options: EnqueueSlotOptions,
): Promise<void> {
  const previous = slotSyncQueues.get(options.userId) ?? Promise.resolve();
  const pending = previous
    .catch(() => undefined)
    .then(() => synchronizeSlotReminders(events, options));
  slotSyncQueues.set(options.userId, pending);
  void pending.then(
    () => { if (slotSyncQueues.get(options.userId) === pending) slotSyncQueues.delete(options.userId); },
    () => { if (slotSyncQueues.get(options.userId) === pending) slotSyncQueues.delete(options.userId); },
  );
  return pending;
}

async function readNotifyTypes(userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("planner_settings")
    .select("notify_types")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("notification settings unavailable");
  return data?.notify_types ?? null;
}

function timerReminder(
  session: TimerReminderSession,
  userId: string,
  notifyTypes: unknown,
  language?: string,
): ScheduledPushInsert | null {
  if (!session.id || session.pausedAt !== null || !isNotifyTypeEnabled(notifyTypes, "pomodoro")) return null;
  const hidden = hideSubjectEnabled(notifyTypes);
  const subject = session.task.subject?.trim() || translation("focusTimer.defaultSubject", {}, language);
  const kind = session.phase === "focus" ? "pomodoro_end" : "break_end";
  const firstLessonIndex = Number.isInteger(session.task.lessonFrom) && (session.task.lessonFrom ?? -1) >= 0
    ? session.task.lessonFrom as number
    : 0;
  const lastLessonIndex = Number.isInteger(session.task.lessonTo) && (session.task.lessonTo ?? -1) >= firstLessonIndex
    ? session.task.lessonTo as number
    : firstLessonIndex;
  const lesson = firstLessonIndex + 1 + (session.phase === "focus" ? 0 : 1);
  const total = Math.max(lesson, lastLessonIndex + 1);
  const title = kind === "pomodoro_end"
    ? translation(`pushSchedule.pomodoroEnd.title${hidden ? "Private" : ""}`, { subject }, language)
    : translation(`pushSchedule.breakEnd.title${hidden ? "Private" : ""}`, { subject }, language);
  const body = kind === "pomodoro_end"
    ? translation(`pushSchedule.pomodoroEnd.body${hidden ? "Private" : ""}`, {
        block: Math.max(1, session.cycle + 1),
        minutes: Math.max(1, Math.round(session.nextBreakMinutes ?? 5)),
      }, language)
    : translation(`pushSchedule.breakEnd.body${hidden ? "Private" : ""}`, { lesson, total }, language);
  return {
    user_id: userId,
    kind,
    send_at: new Date(session.phaseEndsAt).toISOString(),
    title: cleanText(title, 80),
    body: cleanText(body, 160),
    url: internalPlanUrl(session.task.eventId, language),
    tag: "erga-timer",
    focus_session_id: session.id,
  };
}

export async function synchronizePhasePushWithStore(
  store: PushScheduleStore,
  session: TimerReminderSession,
  notifyTypes: unknown,
  options: { now?: Date; language?: string } = {},
): Promise<void> {
  if (!session.id) return;
  const now = options.now ?? new Date();
  await store.cancelForSession(session.userId, session.id, now.toISOString());
  const row = timerReminder(session, session.userId, notifyTypes, options.language);
  if (row) await store.insert(session.userId, [row]);
}

export async function syncFocusPhasePush(session: TimerReminderSession, userId: string): Promise<void> {
  if (!session.id) return;
  const cancelled = await cancelForSession(session.id, userId);
  if (!cancelled || session.pausedAt !== null) return;
  await enqueuePhaseEnd({ ...session, userId }, userId);
}

export async function cancelForSession(
  sessionId: string | null | undefined,
  userId: string | null,
): Promise<boolean> {
  if (!sessionId || !userId) return true;
  try {
    await supabasePushScheduleStore.cancelForSession(userId, sessionId, new Date().toISOString());
    return true;
  } catch {
    console.warn("[push] timer reminder cancellation failed");
    return false;
  }
}

export async function enqueuePhaseEnd(session: TimerReminderSession, userId: string): Promise<void> {
  if (!session.id || session.pausedAt !== null) return;
  try {
    const notifyTypes = await readNotifyTypes(userId);
    const row = timerReminder({ ...session, userId }, userId, notifyTypes);
    if (row) await supabasePushScheduleStore.insert(userId, [row]);
  } catch {
    console.warn("[push] timer reminder enqueue failed");
  }
}

export const supabasePushScheduleStore: PushScheduleStore = {
  async listManaged(userId) {
    const { data, error } = await supabase
      .from("scheduled_pushes")
      .select("id, kind, tag, send_at, title, body, url, sent_at, cancelled_at, skip_reason")
      .eq("user_id", userId)
      .in("kind", ["slot_start", "evening_summary"])
      .is("cancelled_at", null);
    if (error) throw error;
    return (data ?? []) as ExistingScheduledPush[];
  },
  async cancelPending(userId, ids, cancelledAt) {
    if (!ids.length) return;
    const { error } = await supabase
      .from("scheduled_pushes")
      .update({ cancelled_at: cancelledAt })
      .eq("user_id", userId)
      .in("id", [...ids])
      .is("sent_at", null)
      .is("cancelled_at", null);
    if (error) throw error;
  },
  async cancelForSession(userId, sessionId, cancelledAt) {
    const { error } = await supabase
      .from("scheduled_pushes")
      .update({ cancelled_at: cancelledAt })
      .eq("user_id", userId)
      .eq("focus_session_id", sessionId)
      .is("sent_at", null)
      .is("cancelled_at", null);
    if (error) throw error;
  },
  async insert(userId, rows) {
    if (!rows.length) return;
    const scopedRows = rows.map((row) => ({ ...row, user_id: userId }));
    const { error } = await supabase.from("scheduled_pushes").insert(scopedRows);
    if (error) throw error;
  },
};
