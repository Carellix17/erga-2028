// Logica pura della griglia routine: conversioni orarie, blocchi che
// attraversano la mezzanotte, rilevamento sovrapposizioni e layout a corsie.
// Estratta dall'editor settimanale per essere riusata dal Core e testata da sola.

import type { RoutineKind, UserRoutine } from "@/hooks/useUserRoutines";

// Riesportati per i consumer (e i test) che non devono caricare il client del database.
export type { RoutineKind, UserRoutine };

export interface RoutineKindMeta {
  value: RoutineKind;
  label: string;
}

// Categorie ammesse dal database (CHECK sul tipo): scuola, sonno, pasti, altro.
// "Altro" copre sport, hobby e ogni impegno fisso fuori dallo studio.
export const ROUTINE_KINDS: RoutineKindMeta[] = [
  { value: "school", label: "Scuola" },
  { value: "sleep", label: "Sonno" },
  { value: "meal", label: "Pasti" },
  { value: "other", label: "Altro" },
];

export const routineKindLabel = (kind: RoutineKind) =>
  ROUTINE_KINDS.find((k) => k.value === kind)?.label ?? kind;

// 1 = Lunedì ... 7 = Domenica (convenzione ISO della tabella user_routines)
export interface RoutineDayMeta {
  n: number;
  short: string;
  label: string;
}

export const ROUTINE_DAYS: RoutineDayMeta[] = [
  { n: 1, short: "L", label: "Lunedì" },
  { n: 2, short: "M", label: "Martedì" },
  { n: 3, short: "M", label: "Mercoledì" },
  { n: 4, short: "G", label: "Giovedì" },
  { n: 5, short: "V", label: "Venerdì" },
  { n: 6, short: "S", label: "Sabato" },
  { n: 7, short: "D", label: "Domenica" },
];

export const routineDayLabel = (n: number) =>
  ROUTINE_DAYS.find((d) => d.n === n)?.label ?? "giorno selezionato";

export const ROUTINE_ROW_H = 48; // px per ora → 1h = 48px, 2h = 96px
export const ROUTINE_GRID_HEIGHT = 24 * ROUTINE_ROW_H;
export const ROUTINE_MIN_BLOCK_PX = 32;
export const ROUTINE_MIN_BLOCK_MIN = Math.ceil((ROUTINE_MIN_BLOCK_PX / ROUTINE_ROW_H) * 60);
export const ROUTINE_HOURS = Array.from({ length: 24 }, (_, i) => i);

/** "HH:MM[:SS]" → minuti dalla mezzanotte. */
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** minuti → "HH:MM" (24:00 ammesso come fine giornata). */
export const minToTime = (m: number) => {
  if (m >= 24 * 60) return "24:00";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** "08:00:00" → "08:00" */
export const fmtTime = (t: string) => t.slice(0, 5);

export const nextRoutineDay = (d: number) => (d === 7 ? 1 : d + 1);

export interface TimeWindow {
  day: number;
  startMin: number;
  endMin: number;
  routine?: UserRoutine;
}

export interface RoutineSegment {
  routine: UserRoutine;
  day: number;
  startMin: number;
  endMin: number;
}

export interface LaidOutSegment extends RoutineSegment {
  lane: number;
  laneCount: number;
  /** Top effettivo (px), spinto sotto un blocco precedente minimale che altrimenti si sovrapporrebbe. */
  renderTopPx: number;
  /** Altezza effettiva (px), rispetta ROUTINE_MIN_BLOCK_PX. */
  renderHeightPx: number;
}

/**
 * Trasforma una routine in finestre giorno-per-giorno. Se la fine precede
 * l'inizio (es. 22:00 → 06:00) il blocco attraversa la mezzanotte e viene
 * spezzato in due finestre su giorni consecutivi.
 */
export const splitRoutineWindows = (
  startTime: string,
  endTime: string,
  days: number[],
  routine?: UserRoutine,
): TimeWindow[] => {
  const s = toMin(startTime);
  const e = toMin(endTime);
  const windows: TimeWindow[] = [];
  for (const d of days) {
    if (!ROUTINE_DAYS.some((day) => day.n === d)) continue;
    if (e > s) {
      windows.push({ day: d, startMin: s, endMin: e, routine });
    } else {
      windows.push({ day: d, startMin: s, endMin: 24 * 60, routine });
      windows.push({ day: nextRoutineDay(d), startMin: 0, endMin: e, routine });
    }
  }
  return windows;
};

/** Due finestre si sovrappongono solo se stesso giorno E stretta intersezione temporale. */
export const windowsOverlap = (a: TimeWindow, b: TimeWindow) =>
  a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;

export interface RoutineConflict {
  candidate: TimeWindow;
  existing: TimeWindow;
}

/**
 * Cerca il primo conflitto tra il blocco candidato e le routine esistenti
 * (escludendo quella in modifica). Gestisce anche i blocchi overnight.
 */
export const findRoutineConflict = (
  candidate: { startTime: string; endTime: string; days: number[] },
  existing: UserRoutine[],
  excludeId?: string | null,
): RoutineConflict | null => {
  const candidateWindows = splitRoutineWindows(candidate.startTime, candidate.endTime, candidate.days);
  const existingWindows = existing
    .filter((r) => r.id !== excludeId)
    .flatMap((r) => splitRoutineWindows(r.start_time, r.end_time, r.days_of_week ?? [], r));
  for (const c of candidateWindows) {
    const hit = existingWindows.find((w) => windowsOverlap(c, w));
    if (hit) return { candidate: c, existing: hit };
  }
  return null;
};

/** Raggruppa le routine in segmenti per giorno, spezzando i blocchi overnight. */
export const routineSegmentsByDay = (
  routines: UserRoutine[],
): Record<number, RoutineSegment[]> => {
  const map: Record<number, RoutineSegment[]> = {};
  for (const d of ROUTINE_DAYS) map[d.n] = [];
  for (const r of routines) {
    for (const w of splitRoutineWindows(r.start_time, r.end_time, r.days_of_week ?? [], r)) {
      if (map[w.day]) {
        map[w.day].push({ routine: r, day: w.day, startMin: w.startMin, endMin: w.endMin });
      }
    }
  }
  for (const d of ROUTINE_DAYS) map[d.n].sort((a, b) => a.startMin - b.startMin);
  return map;
};

const pxFromMin = (m: number) => (m / 60) * ROUTINE_ROW_H;

/**
 * Layout a corsie: segmenti sovrapposti nello stesso giorno si dividono lo
 * spazio orizzontale; segmenti adiacenti (fine = inizio dell'altro) NON
 * collidono e occupano l'intera larghezza.
 */
export const layoutRoutineSegments = (segments: RoutineSegment[]): LaidOutSegment[] => {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laidOut: LaidOutSegment[] = [];

  let group: RoutineSegment[] = [];
  let groupEnd = 0;

  const flushGroup = () => {
    if (!group.length) return;
    const lanes: number[] = [];
    const groupLayout: LaidOutSegment[] = [];

    for (const seg of group) {
      const lane = lanes.findIndex((end) => end <= seg.startMin);
      const assignedLane = lane === -1 ? lanes.length : lane;
      lanes[assignedLane] = seg.endMin;
      groupLayout.push({ ...seg, lane: assignedLane, laneCount: 1, renderTopPx: 0, renderHeightPx: 0 });
    }

    const laneCount = Math.max(1, lanes.length);
    laidOut.push(...groupLayout.map((seg) => ({ ...seg, laneCount })));
    group = [];
    groupEnd = 0;
  };

  for (const seg of sorted) {
    if (!group.length) {
      group = [seg];
      groupEnd = seg.endMin;
      continue;
    }
    if (seg.startMin < groupEnd) {
      group.push(seg);
      groupEnd = Math.max(groupEnd, seg.endMin);
    } else {
      flushGroup();
      group = [seg];
      groupEnd = seg.endMin;
    }
  }
  flushGroup();

  // Top/altezza per corsia: ogni blocco onora l'altezza minima visiva e non
  // copre mai il blocco precedente della stessa corsia.
  const byLane = new Map<number, LaidOutSegment[]>();
  for (const seg of laidOut) {
    const arr = byLane.get(seg.lane) ?? [];
    arr.push(seg);
    byLane.set(seg.lane, arr);
  }
  for (const arr of byLane.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    let prevBottom = 0;
    for (const seg of arr) {
      const chronologicalTop = pxFromMin(seg.startMin);
      const rawHeight = pxFromMin(seg.endMin - seg.startMin);
      const top = Math.max(chronologicalTop, prevBottom);
      const height = Math.max(ROUTINE_MIN_BLOCK_PX, rawHeight);
      seg.renderTopPx = top;
      seg.renderHeightPx = height;
      prevBottom = top + height;
    }
  }

  return laidOut;
};

export const routineLayoutByDay = (routines: UserRoutine[]): Record<number, LaidOutSegment[]> => {
  const segments = routineSegmentsByDay(routines);
  const map: Record<number, LaidOutSegment[]> = {};
  for (const d of ROUTINE_DAYS) map[d.n] = layoutRoutineSegments(segments[d.n] ?? []);
  return map;
};
