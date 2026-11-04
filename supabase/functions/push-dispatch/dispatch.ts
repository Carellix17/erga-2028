export const PUSH_BATCH_LIMIT = 200;
export const PUSH_CONCURRENCY_LIMIT = 20;
export const MAX_REQUEST_BODY_BYTES = 1024;
export const MAX_PAYLOAD_BYTES = 2048;
const ROME_TIME_ZONE = "Europe/Rome";

export type PushKind = "pomodoro_end" | "break_end" | "overrun" | "slot_start" | "evening_summary";
export type PushSkipReason = "daily_cap" | "quiet_hours" | "no_subscription" | "send_error";

export interface ClaimedPush {
  id: string;
  user_id: string;
  kind: string;
  send_at: string;
  title: string;
  body: string;
  url: string;
  tag: string | null;
  focus_session_id: string | null;
  skip_reason: string | null;
}

export interface SentPushRow {
  id: string;
  focus_session_id: string | null;
}

export interface SleepRoutine {
  kind: string;
  start_time: string;
  end_time: string;
  days_of_week: readonly number[];
}

export interface UserPushPolicy {
  notifyTypes: unknown;
  sleepRoutines: readonly SleepRoutine[];
  ok: boolean;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface PushSendOptions {
  urgency: "high";
  ttl: number;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  noSubscription: number;
}

export interface DispatchSummary {
  claimed: number;
  sent: number;
  skipped: Record<PushSkipReason, number>;
}

export interface DispatchDependencies {
  getSecret: () => string | undefined;
  claimDuePushes: (limit: number) => Promise<readonly ClaimedPush[]>;
  updateSkipReason: (userId: string, rowId: string, reason: PushSkipReason) => Promise<void>;
  loadUserPolicy: (userId: string) => Promise<UserPushPolicy>;
  isFocusSessionOwned: (userId: string, sessionId: string) => Promise<{ owned: boolean; ok: boolean }>;
  listSentToday: (userId: string, from: string, until: string) => Promise<{ rows: readonly SentPushRow[]; ok: boolean }>;
  sendPushToUser: (userId: string, payload: PushPayload, options: PushSendOptions) => Promise<PushSendResult>;
  now?: () => Date;
  logSummary?: (summary: DispatchSummary) => void;
}

export interface RomeDayRange {
  dayKey: string;
  from: Date;
  until: Date;
}

function formatParts(value: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: ROME_TIME_ZONE, ...options })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function utcDayKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addCalendarDay(dayKey: string, amount: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return utcDayKey(year, month, day + amount);
}

function offsetAtRome(value: Date): number {
  const parts = formatParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - value.getTime();
}

function romeMidnight(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  // UTC midnight precedes Europe's 02:00 local DST switch on transition days.
  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  return new Date(Date.UTC(year, month - 1, day) - offsetAtRome(utcMidnight));
}

export function romeDateKey(value: Date): string {
  const parts = formatParts(value, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function romeDayRange(value: Date): RomeDayRange {
  const dayKey = romeDateKey(value);
  return {
    dayKey,
    from: romeMidnight(dayKey),
    until: romeMidnight(addCalendarDay(dayKey, 1)),
  };
}

function romeClock(value: Date): { dayKey: string; weekday: number; minute: number } {
  const parts = formatParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const weekdayByName: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
  const minute = Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
  return { dayKey, weekday: weekdayByName[parts.weekday] ?? 0, minute };
}

function timeToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function previousWeekday(day: number): number {
  return day === 1 ? 7 : day - 1;
}

export function isQuietHours(now: Date, routines: readonly SleepRoutine[]): boolean {
  const current = romeClock(now);
  return routines.some((routine) => {
    if (routine.kind !== "sleep") return false;
    const start = timeToMinute(routine.start_time);
    const end = timeToMinute(routine.end_time);
    if (start === null || end === null || start === end) return false;
    const days = routine.days_of_week.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
    if (end > start) {
      return days.includes(current.weekday) && current.minute >= start && current.minute < end;
    }
    return (days.includes(current.weekday) && current.minute >= start)
      || (days.includes(previousWeekday(current.weekday)) && current.minute < end);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function languageFromUrl(value: string): "it" | "en" {
  try {
    const language = new URL(value, "https://erga.invalid").searchParams.get("lang");
    return language === "en" ? "en" : "it";
  } catch {
    return "it";
  }
}

function privateCopy(kind: PushKind, language: "it" | "en"): Pick<PushPayload, "title" | "body"> {
  const copies: Record<"it" | "en", Record<PushKind, Pick<PushPayload, "title" | "body">>> = {
    it: {
      pomodoro_end: { title: "Pausa!", body: "Il blocco di studio è terminato." },
      break_end: { title: "Si riparte", body: "La pausa è finita: riprendi il tuo studio." },
      overrun: { title: "Tempo finito", body: "Hai superato la fine dello slot." },
      slot_start: { title: "Tra 5 minuti si studia", body: "Preparati per il prossimo slot." },
      evening_summary: { title: "Piano aggiornato", body: "Il tuo piano di studio è stato aggiornato." },
    },
    en: {
      pomodoro_end: { title: "Break time", body: "Your study block is finished." },
      break_end: { title: "Time to get back to it", body: "Your break is over. Resume your study plan." },
      overrun: { title: "Time's up", body: "Your study slot has ended." },
      slot_start: { title: "Study starts in 5 minutes", body: "Get ready for your next study slot." },
      evening_summary: { title: "Plan updated", body: "Your study plan has been updated." },
    },
  };
  return copies[language][kind];
}

function isPushKind(value: string): value is PushKind {
  return value === "pomodoro_end"
    || value === "break_end"
    || value === "overrun"
    || value === "slot_start"
    || value === "evening_summary";
}

function isTimerKind(kind: PushKind): boolean {
  return kind === "pomodoro_end" || kind === "break_end" || kind === "overrun";
}

function isNotificationTypeEnabled(notifyTypes: unknown, kind: PushKind): boolean {
  const types = isRecord(notifyTypes) ? notifyTypes : {};
  const key = kind === "pomodoro_end" || kind === "break_end" ? "pomodoro" : kind;
  const enabled = types[key];
  return typeof enabled !== "boolean" || enabled;
}

export function validateClaimedPush(row: ClaimedPush): row is ClaimedPush & { kind: PushKind } {
  if (!isPushKind(row.kind)) return false;
  if (typeof row.title !== "string" || Array.from(row.title).length > 80) return false;
  if (typeof row.body !== "string" || Array.from(row.body).length > 160) return false;
  if (typeof row.url !== "string" || !row.url.startsWith("/") || row.url.startsWith("//")) return false;
  if (row.tag !== null && (typeof row.tag !== "string" || Array.from(row.tag).length > 64)) return false;
  if (isTimerKind(row.kind)) {
    return typeof row.focus_session_id === "string" && row.focus_session_id.trim().length > 0;
  }
  return row.focus_session_id === null;
}

function payloadForRow(row: ClaimedPush & { kind: PushKind }, hideSubject: boolean): PushPayload | null {
  const copy = hideSubject
    ? privateCopy(row.kind, languageFromUrl(row.url))
    : { title: row.title, body: row.body };
  const payload: PushPayload = {
    title: copy.title,
    body: copy.body,
    url: row.url,
    ...(row.tag ? { tag: row.tag } : {}),
  };
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD_BYTES) return null;
  return payload;
}

function summary(): DispatchSummary {
  return {
    claimed: 0,
    sent: 0,
    skipped: { daily_cap: 0, quiet_hours: 0, no_subscription: 0, send_error: 0 },
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function requestBodyTooLarge(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return true;
    const declaredLength = Number(contentLength);
    return !Number.isSafeInteger(declaredLength) || declaredLength > MAX_REQUEST_BODY_BYTES;
  }
  // This endpoint does not consume a body. Refuse unknown/chunked body lengths
  // rather than reading bytes just to discover whether the cap was exceeded.
  return request.body !== null;
}

export async function constantTimeSecretEqual(expected: string, actual: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedDigest, actualDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
  ]);
  const expectedBytes = new Uint8Array(expectedDigest);
  const actualBytes = new Uint8Array(actualDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ actualBytes[index];
  }
  return difference < 1;
}

function safeLog(dependencies: DispatchDependencies, counts: DispatchSummary): void {
  try {
    dependencies.logSummary?.(counts);
  } catch {
    // Logging cannot change the result of a claimed batch.
  }
}

function skipReason(counts: DispatchSummary, reason: PushSkipReason): void {
  counts.skipped[reason] += 1;
}

async function markSkip(
  dependencies: DispatchDependencies,
  row: ClaimedPush,
  reason: PushSkipReason,
): Promise<void> {
  try {
    // Only skip_reason is updated after the atomic claim; ownership is checked on both keys.
    await dependencies.updateSkipReason(row.user_id, row.id, reason);
  } catch {
    // Do not log identifiers or notification content.
  }
}

interface UserSentCounts {
  ordinary: number;
  timer: number;
}

function buildUserSentCounts(
  rows: readonly SentPushRow[],
  currentClaimIds: ReadonlySet<string>,
): UserSentCounts {
  return rows.reduce<UserSentCounts>((counts, row) => {
    if (currentClaimIds.has(row.id)) return counts;
    if (row.focus_session_id === null) counts.ordinary += 1;
    else counts.timer += 1;
    return counts;
  }, { ordinary: 0, timer: 0 });
}

export function createPushDispatchHandler(dependencies: DispatchDependencies): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
    }

    let configuredSecret: string | undefined;
    try {
      configuredSecret = dependencies.getSecret();
    } catch {
      configuredSecret = undefined;
    }
    if (typeof configuredSecret !== "string" || Array.from(configuredSecret).length < 32) {
      return jsonResponse({ error: "unavailable" }, 503);
    }

    const suppliedSecret = request.headers.get("x-dispatch-secret");
    if (suppliedSecret === null || suppliedSecret.length > 4096) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    try {
      if (!(await constantTimeSecretEqual(configuredSecret, suppliedSecret))) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    } catch {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    if (await requestBodyTooLarge(request)) {
      return jsonResponse({ error: "payload_too_large" }, 413);
    }

    let claimed: readonly ClaimedPush[];
    try {
      claimed = await dependencies.claimDuePushes(PUSH_BATCH_LIMIT);
    } catch {
      const counts = summary();
      safeLog(dependencies, counts);
      return jsonResponse(counts, 500);
    }

    const counts = summary();
    counts.claimed = claimed.length;
    const now = (dependencies.now ?? (() => new Date()))();
    const day = romeDayRange(now);
    const claimedIdsByUser = new Map<string, Set<string>>();
    const groups = new Map<string, ClaimedPush[]>();
    for (const row of [...claimed].sort((left, right) => left.send_at.localeCompare(right.send_at))) {
      const ids = claimedIdsByUser.get(row.user_id) ?? new Set<string>();
      ids.add(row.id);
      claimedIdsByUser.set(row.user_id, ids);
      groups.set(row.user_id, [...(groups.get(row.user_id) ?? []), row]);
    }

    const policyCache = new Map<string, Promise<UserPushPolicy>>();
    const sentCountCache = new Map<string, Promise<UserSentCounts | null>>();
    const sessionOwnerCache = new Map<string, Promise<{ owned: boolean; ok: boolean }>>();
    const ordinarySentThisRun = new Map<string, number>();
    const timerSentThisRun = new Map<string, number>();

    const loadPolicy = (userId: string): Promise<UserPushPolicy> => {
      let pending = policyCache.get(userId);
      if (!pending) {
        pending = dependencies.loadUserPolicy(userId).catch(() => ({ notifyTypes: null, sleepRoutines: [], ok: false }));
        policyCache.set(userId, pending);
      }
      return pending;
    };

    const loadSentCounts = (userId: string): Promise<UserSentCounts | null> => {
      let pending = sentCountCache.get(userId);
      if (!pending) {
        pending = dependencies.listSentToday(userId, day.from.toISOString(), day.until.toISOString())
          .then((result) => result.ok
            ? buildUserSentCounts(result.rows, claimedIdsByUser.get(userId) ?? new Set())
            : null)
          .catch(() => null);
        sentCountCache.set(userId, pending);
      }
      return pending;
    };

    const ownsSession = (userId: string, sessionId: string): Promise<{ owned: boolean; ok: boolean }> => {
      const key = `${userId}:${sessionId}`;
      let pending = sessionOwnerCache.get(key);
      if (!pending) {
        pending = dependencies.isFocusSessionOwned(userId, sessionId)
          .catch(() => ({ owned: false, ok: false }));
        sessionOwnerCache.set(key, pending);
      }
      return pending;
    };

    const processRow = async (row: ClaimedPush): Promise<void> => {
      let reason: PushSkipReason | null = null;
      if (!validateClaimedPush(row)) {
        reason = "send_error";
      }

      const kind = isPushKind(row.kind) ? row.kind : null;
      const timer = row.focus_session_id !== null;
      if (!reason && timer && row.focus_session_id) {
        const ownership = await ownsSession(row.user_id, row.focus_session_id);
        if (!ownership.ok || !ownership.owned) reason = "send_error";
      }

      let policy: UserPushPolicy | null = null;
      let userSentCounts: UserSentCounts | null = null;
      if (!reason) {
        policy = await loadPolicy(row.user_id);
        if (!policy?.ok || !kind) {
          reason = "send_error";
        } else if (!isNotificationTypeEnabled(policy.notifyTypes, kind)) {
          reason = "send_error";
        }
      }
      if (!reason) {
        userSentCounts = await loadSentCounts(row.user_id);
        if (!userSentCounts) reason = "send_error";
      }

      if (!reason && policy && kind && !timer && isQuietHours(now, policy.sleepRoutines)) {
        reason = "quiet_hours";
      }

      if (!reason && userSentCounts) {
        const priorCount = timer
          ? userSentCounts.timer + (timerSentThisRun.get(row.user_id) ?? 0)
          : userSentCounts.ordinary + (ordinarySentThisRun.get(row.user_id) ?? 0);
        if (priorCount >= (timer ? 40 : 6)) reason = "daily_cap";
      }

      let payload: PushPayload | null = null;
      if (!reason && kind && policy) {
        const notifyTypes = isRecord(policy.notifyTypes) ? policy.notifyTypes : {};
        const hideSubject = notifyTypes.hide_subject === true;
        payload = payloadForRow(row as ClaimedPush & { kind: PushKind }, hideSubject);
        if (!payload) reason = "send_error";
      }

      if (!reason && kind && payload) {
        try {
          const sendResult = await dependencies.sendPushToUser(row.user_id, payload, {
            urgency: "high",
            ttl: isTimerKind(kind) ? 300 : 3600,
          });
          if (sendResult.sent > 0) {
            counts.sent += 1;
            if (timer) timerSentThisRun.set(row.user_id, (timerSentThisRun.get(row.user_id) ?? 0) + 1);
            else ordinarySentThisRun.set(row.user_id, (ordinarySentThisRun.get(row.user_id) ?? 0) + 1);
            return;
          }
          reason = sendResult.noSubscription > 0 && sendResult.failed === 0
            ? "no_subscription"
            : "send_error";
        } catch {
          reason = "send_error";
        }
      }

      const finalReason = reason ?? "send_error";
      await markSkip(dependencies, row, finalReason);
      skipReason(counts, finalReason);
    };

    const userGroups = [...groups.values()];
    let nextGroup = 0;
    const workerCount = Math.min(PUSH_CONCURRENCY_LIMIT, userGroups.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextGroup < userGroups.length) {
        const groupIndex = nextGroup;
        nextGroup += 1;
        const group = userGroups[groupIndex];
        for (const row of group) await processRow(row);
      }
    }));

    safeLog(dependencies, counts);
    return jsonResponse(counts, 200);
  };
}
