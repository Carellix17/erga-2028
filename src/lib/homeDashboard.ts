export function toLocalDayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function daysUntil(dateValue: Date | string, now = new Date()): number {
  const target = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((targetDay - startDay) / 86_400_000);
}

/**
 * Conta i giorni consecutivi con almeno una sessione conclusa.
 * Una serie resta attiva anche se oggi non si è ancora studiato, purché ci sia
 * stata una sessione ieri: non penalizziamo l'utente a metà giornata.
 */
export function computeStudyStreak(completedAt: string[], now = new Date()): number {
  const studiedDays = new Set(completedAt.map(toLocalDayKey).filter(Boolean));
  if (studiedDays.size === 0) return 0;

  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!studiedDays.has(toLocalDayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!studiedDays.has(toLocalDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (studiedDays.has(toLocalDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function formatEventTime(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : null;
}
