import { addDays, toLocalDayKey } from "@/lib/homeDashboard";

/** Dati minimali di una sessione Focus, già filtrati per l'utente autenticato. */
export interface FocusSessionStat {
  id: string;
  actualDuration: number;
  completedAt: string;
  subjectName: string | null;
  taskLabel: string | null;
}

export interface FocusDayStat {
  date: string;
  minutes: number;
  sessions: number;
}

export interface FocusPeriodSummary {
  minutes: number;
  sessions: number;
  activeDays: number;
  averageSessionMinutes: number;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getFocusPeriodStart(days: number, now = new Date()): Date {
  const safeDays = Math.max(1, Math.floor(days));
  return addDays(startOfLocalDay(now), -(safeDays - 1));
}

export function localDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
}

function hasUsableDate(session: FocusSessionStat): boolean {
  return Boolean(toLocalDayKey(session.completedAt));
}

export function getFocusSessionsForPeriod(
  sessions: FocusSessionStat[],
  days: number,
  now = new Date(),
): FocusSessionStat[] {
  const startKey = toLocalDayKey(getFocusPeriodStart(days, now));
  const endKey = toLocalDayKey(now);

  return sessions.filter((session) => {
    if (!hasUsableDate(session)) return false;
    const key = toLocalDayKey(session.completedAt);
    return key >= startKey && key <= endKey;
  });
}

/**
 * Costruisce una serie continua, inclusi i giorni senza Focus. In questo modo
 * il grafico racconta il ritmo reale e non collega artificialmente due giorni
 * distanti in cui è stata conclusa una sessione.
 */
export function buildFocusDailyStats(
  sessions: FocusSessionStat[],
  days: number,
  now = new Date(),
): FocusDayStat[] {
  const safeDays = Math.max(1, Math.floor(days));
  const start = getFocusPeriodStart(safeDays, now);
  const byDay = new Map<string, FocusDayStat>();

  for (let index = 0; index < safeDays; index += 1) {
    const date = addDays(start, index);
    const key = toLocalDayKey(date);
    byDay.set(key, { date: key, minutes: 0, sessions: 0 });
  }

  for (const session of getFocusSessionsForPeriod(sessions, safeDays, now)) {
    const key = toLocalDayKey(session.completedAt);
    const entry = byDay.get(key);
    if (!entry) continue;
    entry.minutes += Math.max(0, session.actualDuration || 0);
    entry.sessions += 1;
  }

  return Array.from(byDay.values());
}

export function summarizeFocusPeriod(
  sessions: FocusSessionStat[],
  days: number,
  now = new Date(),
): FocusPeriodSummary {
  const periodSessions = getFocusSessionsForPeriod(sessions, days, now);
  const minutes = periodSessions.reduce((total, session) => total + Math.max(0, session.actualDuration || 0), 0);
  const activeDays = new Set(periodSessions.map((session) => toLocalDayKey(session.completedAt)).filter(Boolean)).size;

  return {
    minutes,
    sessions: periodSessions.length,
    activeDays,
    averageSessionMinutes: periodSessions.length > 0 ? Math.round(minutes / periodSessions.length) : 0,
  };
}

/** Il periodo precedente, della stessa ampiezza, per un confronto descrittivo. */
export function summarizePreviousFocusPeriod(
  sessions: FocusSessionStat[],
  days: number,
  now = new Date(),
): FocusPeriodSummary {
  const safeDays = Math.max(1, Math.floor(days));
  const previousEnd = addDays(startOfLocalDay(now), -safeDays);
  return summarizeFocusPeriod(sessions, safeDays, previousEnd);
}
