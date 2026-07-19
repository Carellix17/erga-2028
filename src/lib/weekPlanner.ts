import { addDays, startOfWeek, format } from "date-fns";

/**
 * Logica di supporto per la vista "Settimana" del Piano.
 * Tutte funzioni pure (niente React): facili da testare.
 */

/** I 7 giorni (lun-dom) della settimana che contiene `date`. */
export function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Chiave giorno locale "YYYY-MM-DD" per confrontare date tra loro. */
export function dayKey(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : format(d, "yyyy-MM-dd");
}

/** "HH:MM" | "HH:MM:SS" -> minuti dall'inizio del giorno. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Minuti dall'inizio del giorno per una data/tempo ISO (fuso locale). */
export function isoToDayMinutes(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export interface TimeBlock {
  start: number; // minuti dall'inizio del giorno
  end: number;
}

/**
 * I segmenti di una routine che ricadono nel giorno della settimana `dayN`
 * (1 = lunedì ... 7 = domenica).
 * Gestisce i blocchi "a cavallo di mezzanotte" (es. sonno 23:00 -> 07:00):
 * "giorno X, 23:00 -> 07:00" significa X: 23:00->24:00 E X+1: 00:00->07:00.
 */
export function routineSegmentsForDay(
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  dayN: number,
): TimeBlock[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || start === end) return [];

  if (end > start) {
    // Blocco normale: appartiene al suo stesso giorno
    return daysOfWeek.includes(dayN) ? [{ start, end }] : [];
  }

  // Blocco overnight: due segmenti su due giorni diversi
  const segments: TimeBlock[] = [];
  if (daysOfWeek.includes(dayN)) segments.push({ start, end: 24 * 60 });
  const prevDay = dayN === 1 ? 7 : dayN - 1;
  if (daysOfWeek.includes(prevDay)) segments.push({ start: 0, end });
  return segments;
}

// ---- Posizionamento grafico ----

export const WEEK_HOUR_START = 6;
export const WEEK_HOUR_END = 24;
export const WEEK_ROW_H = 40; // px per ora
export const WEEK_GRID_HEIGHT = (WEEK_HOUR_END - WEEK_HOUR_START) * WEEK_ROW_H;

/** Posizione in pixel dall'alto della griglia per un orario in minuti. */
export function blockTop(minutes: number): number {
  const clamped = Math.max(WEEK_HOUR_START * 60, Math.min(WEEK_HOUR_END * 60, minutes));
  return ((clamped - WEEK_HOUR_START * 60) / 60) * WEEK_ROW_H;
}

/** Altezza in pixel per durata in minuti (almeno un'altezza minima leggibile). */
export function blockHeight(durationMin: number): number {
  const MIN_PX = 26;
  return Math.max(MIN_PX, (durationMin / 60) * WEEK_ROW_H);
}

export interface PositionedEvent {
  id: string;
  title: string;
  subjectName?: string;
  top: number;
  height: number;
  kind: "study" | "test" | "assignment" | "evaluation";
}

/**
 * Posiziona gli eventi di UN giorno dentro la griglia.
 * Chi stabilisce il colore e' il chiamante (le materie hanno colori loro).
 * Gli eventi senza orario NON vengono restituiti qui: finiscono nella
 * striscia "senza orario" in cima alla colonna.
 */
export function positionDayEvents(
  rows: { id: string; title: string; subjectName?: string; minutes: number | null; kind: PositionedEvent["kind"] }[],
  defaultDurationMin = 50,
): { timed: PositionedEvent[]; untimed: { id: string; title: string; subjectName?: string; kind: PositionedEvent["kind"] }[] } {
  const timed: PositionedEvent[] = [];
  const untimed: { id: string; title: string; subjectName?: string; kind: PositionedEvent["kind"] }[] = [];
  for (const r of rows) {
    if (r.minutes === null) {
      untimed.push({ id: r.id, title: r.title, subjectName: r.subjectName, kind: r.kind });
    } else {
      timed.push({
        id: r.id,
        title: r.title,
        subjectName: r.subjectName,
        kind: r.kind,
        top: blockTop(r.minutes),
        height: blockHeight(defaultDurationMin),
      });
    }
  }
  // Gli eventi sovrapposti restano tali: la larghezza intera li rende comunque leggibili
  timed.sort((a, b) => a.top - b.top);
  return { timed, untimed };
}
