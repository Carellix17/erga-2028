import { describe, expect, it } from "vitest";
import {
  findRoutineConflict,
  layoutRoutineSegments,
  minToTime,
  nextRoutineDay,
  routineSegmentsByDay,
  splitRoutineWindows,
  toMin,
  windowsOverlap,
  type TimeWindow,
  type UserRoutine,
} from "@/lib/routineLayout";

const routine = (over: Partial<UserRoutine> = {}): UserRoutine => ({
  id: "r1",
  user_id: "u1",
  kind: "school",
  label: "Scuola",
  start_time: "08:00:00",
  end_time: "13:00:00",
  days_of_week: [1, 2, 3, 4, 5],
  ...over,
});

describe("conversioni orarie", () => {
  it("converte HH:MM in minuti e ritorno", () => {
    expect(toMin("00:00")).toBe(0);
    expect(toMin("08:30")).toBe(510);
    expect(toMin("23:59")).toBe(1439);
    expect(toMin("08:00:00")).toBe(480); // tollera i secondi
    expect(minToTime(0)).toBe("00:00");
    expect(minToTime(510)).toBe("08:30");
    expect(minToTime(1440)).toBe("24:00"); // fine giornata
  });

  it("passa al giorno successivo (domenica → lunedì)", () => {
    expect(nextRoutineDay(7)).toBe(1);
    expect(nextRoutineDay(3)).toBe(4);
  });
});

describe("splitRoutineWindows", () => {
  it("un blocco normale produce una finestra per giorno", () => {
    const w = splitRoutineWindows("08:00", "13:00", [1, 3]);
    expect(w).toHaveLength(2);
    expect(w[0]).toMatchObject({ day: 1, startMin: 480, endMin: 780 });
    expect(w[1]).toMatchObject({ day: 3, startMin: 480, endMin: 780 });
  });

  it("un blocco overnight viene spezzato su due giorni", () => {
    const w = splitRoutineWindows("22:00", "06:00", [1]); // lunedì notte
    expect(w).toHaveLength(2);
    expect(w[0]).toMatchObject({ day: 1, startMin: 1320, endMin: 1440 }); // lun 22:00→24:00
    expect(w[1]).toMatchObject({ day: 2, startMin: 0, endMin: 360 }); // mar 00:00→06:00
  });

  it("un blocco overnight di domenica riporta su lunedì", () => {
    const w = splitRoutineWindows("23:00", "07:00", [7]);
    expect(w[1]).toMatchObject({ day: 1, startMin: 0, endMin: 420 });
  });

  it("ignora i giorni fuori range", () => {
    const w = splitRoutineWindows("08:00", "09:00", [1, 9, 0]);
    expect(w).toHaveLength(1);
    expect(w[0].day).toBe(1);
  });
});

describe("windowsOverlap", () => {
  const win = (day: number, startMin: number, endMin: number): TimeWindow => ({ day, startMin, endMin });

  it("rileva la sovrapposizione nello stesso giorno", () => {
    expect(windowsOverlap(win(1, 480, 780), win(1, 700, 900))).toBe(true);
  });

  it("blocchi adiacenti NON si sovrappongono", () => {
    expect(windowsOverlap(win(1, 480, 780), win(1, 780, 900))).toBe(false);
  });

  it("giorni diversi non si sovrappongono mai", () => {
    expect(windowsOverlap(win(1, 480, 780), win(2, 480, 780))).toBe(false);
  });
});

describe("findRoutineConflict", () => {
  it("blocca un nuovo blocco sovrapposto a uno esistente", () => {
    const existing = [routine()];
    const conflict = findRoutineConflict(
      { startTime: "12:00", endTime: "14:00", days: [1] },
      existing,
    );
    expect(conflict).not.toBeNull();
    expect(conflict?.existing.routine?.id).toBe("r1");
  });

  it("accetta un blocco adiacente senza conflitti", () => {
    const existing = [routine()];
    const conflict = findRoutineConflict(
      { startTime: "13:00", endTime: "14:00", days: [1] },
      existing,
    );
    expect(conflict).toBeNull();
  });

  it("ignora la routine che si sta modificando", () => {
    const existing = [routine()];
    const conflict = findRoutineConflict(
      { startTime: "09:00", endTime: "10:00", days: [1] },
      existing,
      "r1",
    );
    expect(conflict).toBeNull();
  });

  it("rileva i conflitti attraverso la mezzanotte", () => {
    // Sonno 22:00→06:30 dal lunedì: tocca anche il martedì mattina
    const existing = [routine({ id: "sleep", kind: "sleep", label: "Sonno", start_time: "22:00:00", end_time: "06:30:00", days_of_week: [1] })];
    // Palestra martedì 06:00 → 07:00 collide con la coda del sonno
    const conflict = findRoutineConflict(
      { startTime: "06:00", endTime: "07:00", days: [2] },
      existing,
    );
    expect(conflict).not.toBeNull();
    expect(conflict?.existing.startMin).toBe(0);
    expect(conflict?.existing.endMin).toBe(390);
  });
});

describe("layout e segmenti", () => {
  it("raggruppa i segmenti per giorno spezzando l'overnight", () => {
    const byDay = routineSegmentsByDay([
      routine({ id: "sleep", kind: "sleep", start_time: "22:00:00", end_time: "06:00:00", days_of_week: [1] }),
    ]);
    expect(byDay[1]).toHaveLength(1); // lun 22:00→24:00
    expect(byDay[2]).toHaveLength(1); // mar 00:00→06:00
  });

  it("blocchi adiacenti occupano una sola corsia a piena larghezza", () => {
    const laid = layoutRoutineSegments([
      { routine: routine({ id: "a" }), day: 1, startMin: 480, endMin: 600 },
      { routine: routine({ id: "b" }), day: 1, startMin: 600, endMin: 720 },
    ]);
    expect(laid.every((s) => s.laneCount === 1)).toBe(true);
  });

  it("blocchi sovrapposti si dividono in due corsie", () => {
    const laid = layoutRoutineSegments([
      { routine: routine({ id: "a" }), day: 1, startMin: 480, endMin: 720 },
      { routine: routine({ id: "b" }), day: 1, startMin: 600, endMin: 900 },
    ]);
    expect(laid.some((s) => s.laneCount === 2)).toBe(true);
    const lanes = new Set(laid.map((s) => s.lane));
    expect(lanes.size).toBe(2);
  });

  it("rispetta l'altezza minima dei blocchi corti", () => {
    const laid = layoutRoutineSegments([
      { routine: routine({ id: "tiny" }), day: 1, startMin: 480, endMin: 495 }, // 15 minuti
    ]);
    expect(laid[0].renderHeightPx).toBeGreaterThanOrEqual(32);
  });
});
