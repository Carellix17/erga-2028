import { describe, it, expect } from "vitest";
import {
  getWeekDays, timeToMinutes, isoToDayMinutes, routineSegmentsForDay,
  positionDayEvents, blockTop, dayKey, WEEK_HOUR_START,
} from "@/lib/weekPlanner";

describe("getWeekDays", () => {
  it("restituisce lun-dom della settimana che contiene la data", () => {
    // giovedi' 16 luglio 2026
    const days = getWeekDays(new Date(2026, 6, 16));
    expect(days).toHaveLength(7);
    expect(dayKey(days[0])).toBe("2026-07-13"); // lunedi'
    expect(dayKey(days[6])).toBe("2026-07-19"); // domenica
  });

  it("una domenica resta nella SUA settimana (lun-dom)", () => {
    const days = getWeekDays(new Date(2026, 6, 19)); // domenica 19
    expect(dayKey(days[0])).toBe("2026-07-13");
    expect(dayKey(days[6])).toBe("2026-07-19");
  });
});

describe("timeToMinutes", () => {
  it("converte correttamente", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("8:05")).toBe(485);
    expect(timeToMinutes("23:59:59")).toBe(1439);
  });
  it("input non valido -> null", () => {
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes("abc")).toBeNull();
  });
});

describe("routineSegmentsForDay", () => {
  it("blocco normale solo nei giorni dichiarati", () => {
    expect(routineSegmentsForDay([1, 3, 5], "08:00", "13:00", 3)).toEqual([{ start: 480, end: 780 }]);
    expect(routineSegmentsForDay([1, 3, 5], "08:00", "13:00", 2)).toEqual([]);
  });

  it("blocco overnight si spezza tra due giorni", () => {
    // sonno lunedi' 23:00 -> 07:00
    expect(routineSegmentsForDay([1], "23:00", "07:00", 1)).toEqual([{ start: 1380, end: 1440 }]);
    expect(routineSegmentsForDay([1], "23:00", "07:00", 2)).toEqual([{ start: 0, end: 420 }]);
    // martedi' non prende il pezzo serale, lunedi' non prende il pezzo mattutino di domenica
    expect(routineSegmentsForDay([1], "23:00", "07:00", 3)).toEqual([]);
  });

  it("overnight a cavallo della domenica (dom -> lun)", () => {
    expect(routineSegmentsForDay([7], "23:00", "07:00", 7)).toEqual([{ start: 1380, end: 1440 }]);
    expect(routineSegmentsForDay([7], "23:00", "07:00", 1)).toEqual([{ start: 0, end: 420 }]);
  });

  it("start == end non produce blocchi", () => {
    expect(routineSegmentsForDay([1], "08:00", "08:00", 1)).toEqual([]);
  });
});

describe("blockTop (clamping nella griglia)", () => {
  it("un evento prima dell'inizio griglia viene agganciato in cima", () => {
    expect(blockTop((WEEK_HOUR_START - 2) * 60)).toBe(0);
  });
});

describe("positionDayEvents", () => {
  it("separa eventi con orario da quelli senza", () => {
    const { timed, untimed } = positionDayEvents([
      { id: "a", title: "Studio mate", minutes: 540, kind: "study" },
      { id: "b", title: "Verifica storia", minutes: null, kind: "test" },
    ]);
    expect(timed).toHaveLength(1);
    expect(untimed).toHaveLength(1);
    expect(untimed[0].id).toBe("b");
    expect(timed[0].top).toBeGreaterThan(0);
    expect(timed[0].height).toBeGreaterThanOrEqual(26);
  });
});

describe("isoToDayMinutes", () => {
  it("usa l'orario locale dell'ISO", () => {
    const iso = "2026-07-20T14:30:00";
    expect(isoToDayMinutes(iso)).toBe(14 * 60 + 30);
  });
  it("ISO non valido -> null", () => {
    expect(isoToDayMinutes("non-una-data")).toBeNull();
  });
});
