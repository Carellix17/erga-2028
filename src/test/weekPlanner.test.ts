import { describe, it, expect } from "vitest";
import {
  getWeekDays, timeToMinutes, isoToDayMinutes, routineSegmentsForDay,
  positionDayEvents, blockTop, dayKey, mergeBlocks, freeSlots,
  computeGridRange, visibleRoutineBlocks, gridHours,
  WEEK_DAY_START_MIN, WEEK_DAY_END_MIN,
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

describe("isoToDayMinutes", () => {
  it("converte una data ISO in minuti del giorno (fuso locale)", () => {
    const d = new Date(2026, 6, 16, 14, 30);
    expect(isoToDayMinutes(d.toISOString())).toBe(14 * 60 + 30);
  });
  it("input non valido -> null", () => {
    expect(isoToDayMinutes("non-una-data")).toBeNull();
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

describe("mergeBlocks", () => {
  it("unisce blocchi sovrapposti e attaccati", () => {
    expect(mergeBlocks([
      { start: 600, end: 660 },
      { start: 630, end: 720 },
      { start: 720, end: 780 },
    ])).toEqual([{ start: 600, end: 780 }]);
  });
  it("lascia separati i blocchi staccati e ignora quelli vuoti", () => {
    expect(mergeBlocks([
      { start: 120, end: 120 },
      { start: 480, end: 540 },
      { start: 900, end: 960 },
    ])).toEqual([{ start: 480, end: 540 }, { start: 900, end: 960 }]);
  });
});

describe("freeSlots (le finestre libere)", () => {
  it("giornata tipo: sonno -7:00, scuola 8-14, sonno 22:30+ -> finestre 7-8 e 14-22:30", () => {
    const slots = freeSlots([
      { start: 0, end: 420 },     // sonno (pezzo mattutino, overnight)
      { start: 480, end: 840 },   // scuola
      { start: 1350, end: 1440 }, // sonno (pezzo serale)
    ]);
    expect(slots).toEqual([
      { start: 420, end: 480 },   // prima di scuola si puo' studiare
      { start: 840, end: 1350 },  // il pomeriggio/sera
    ]);
  });

  it("la merenda in mezzo spezza la finestra in due (ma resta 'visibile' come buco)", () => {
    const slots = freeSlots([
      { start: 1050, end: 1080 }, // merenda 17:30-18:00
    ]);
    // senza altri blocchi, la merenda divide la giornata utile in due slot
    expect(slots).toEqual([
      { start: WEEK_DAY_START_MIN, end: 1050 },
      { start: 1080, end: WEEK_DAY_END_MIN },
    ]);
  });

  it("buchi piu' corti di 20 minuti non si mostrano", () => {
    const slots = freeSlots([
      { start: 600, end: 615 }, // impegno breve: i buchi attorno sono < 20 min
      { start: 625, end: 1440 },
    ]);
    // 6:00-10:00 (240min) libero, poi 10:15 sonno-coda fino a sera... ricostruiamo:
    // blocchi: 600-615 e 625-1440 => buco 360-600 (240m, ok), buco 615-625 (10m, scartato)
    expect(slots).toEqual([{ start: 360, end: 600 }]);
  });

  it("routine sovrapposte contano una sola volta (merge)", () => {
    const slots = freeSlots([
      { start: 480, end: 660 },
      { start: 600, end: 840 },
    ]);
    expect(slots).toEqual([{ start: 360, end: 480 }, { start: 840, end: 1440 }]);
  });

  it("giornata senza routine: tutto libero", () => {
    expect(freeSlots([])).toEqual([{ start: WEEK_DAY_START_MIN, end: WEEK_DAY_END_MIN }]);
  });
});

describe("computeGridRange (intervallo intelligente)", () => {
  it("senza dati: ripiego ragionevole 8:00-20:00", () => {
    expect(computeGridRange([], [])).toEqual({ startMin: 480, endMin: 1200 });
  });

  it("copre la finestra libera arrotondata all'ora intera", () => {
    // scuola finisce 14:45 -> finestra 14:45-20:30 => griglia 14:00-21:00
    expect(computeGridRange([[{ start: 885, end: 1230 }]], [[]])).toEqual({ startMin: 840, endMin: 1260 });
  });

  it("un evento FUORI dalle finestre libere allarga comunque la griglia", () => {
    expect(computeGridRange([[{ start: 900, end: 1200 }]], [[23 * 60]])).toEqual({ startMin: 900, endMin: 1440 });
  });

  it("finestra piccolissima: la griglia ha una ampiezza minima leggibile", () => {
    const r = computeGridRange([[{ start: 1020, end: 1065 }]], [[]]);
    expect(r.startMin).toBe(1020);
    expect(r.endMin - r.startMin).toBeGreaterThanOrEqual(120);
    expect(r.endMin).toBeLessThanOrEqual(1440);
  });
});

describe("visibleRoutineBlocks", () => {
  const segs = [
    { start: 1350, end: 1440, kind: "sleep" },
    { start: 840, end: 900, kind: "school" },
    { start: 1050, end: 1080, kind: "meal" },
    { start: 60, end: 120, kind: "other" },
  ];

  it("mostra solo gli impegni DENTRO la finestra visibile (e mai il sonno)", () => {
    const vis = visibleRoutineBlocks(segs, 900, 1230);
    // scuola clippata al bordo (900-900 = 0 min: sparisce), merenda intera, sonno mai
    expect(vis.map((v) => v.kind)).toEqual(["meal"]);
    expect(vis[0]).toMatchObject({ start: 1050, end: 1080 });
  });

  it("clippa ai bordi e scarta spiccioli < 5 minuti", () => {
    const vis = visibleRoutineBlocks(
      [{ start: 895, end: 902, kind: "other", label: "x" }],
      900, 1200,
    );
    expect(vis).toHaveLength(0); // solo 2 minuti dentro la finestra
    const vis2 = visibleRoutineBlocks(
      [{ start: 870, end: 960, kind: "school", label: "x" }],
      900, 1200,
    );
    expect(vis2[0]).toMatchObject({ start: 900, end: 960 });
  });
});

describe("gridHours", () => {
  it("un'etichetta per ora tra inizio e fine", () => {
    expect(gridHours(840, 1260)).toEqual([14, 15, 16, 17, 18, 19, 20]);
  });
});

describe("blockTop (con l'intervallo dinamico)", () => {
  it("15:30 con griglia dalle 14:00 -> 60px (1.5 ore * 40px)", () => {
    expect(blockTop(930, 840)).toBe(60);
  });
  it("un evento prima dell'inizio griglia viene agganciato in cima", () => {
    expect(blockTop(800, 840)).toBe(0);
  });
});

describe("positionDayEvents", () => {
  const G = 840; // griglia dalle 14:00

  it("separa eventi con orario da quelli senza", () => {
    const { timed, untimed } = positionDayEvents([
      { id: "a", title: "Studio mate", minutes: 900, kind: "study" },
      { id: "b", title: "Verifica storia", minutes: null, kind: "test" },
    ], G);
    expect(timed).toHaveLength(1);
    expect(untimed).toHaveLength(1);
    expect(untimed[0].id).toBe("b");
    expect(timed[0].top).toBeGreaterThanOrEqual(0);
    expect(timed[0].height).toBeGreaterThanOrEqual(26);
    expect(timed[0].lanes).toBe(1);
  });

  it("NESSUNA sovrapposizione: due eventi allo stesso orario vanno affiancati", () => {
    const { timed } = positionDayEvents([
      { id: "a", title: "A", minutes: 900, kind: "study" },
      { id: "b", title: "B", minutes: 900, kind: "evaluation" },
    ], G);
    expect(timed.map((t) => t.lanes)).toEqual([2, 2]);
    const lanes = timed.map((t) => t.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });

  it("eventi vicini nel tempo (altezza minima) sono comunque affiancati", () => {
    // 15:00 e 15:10: i blocchi alti almeno 26px si toccherebbero -> due colonne
    const { timed } = positionDayEvents([
      { id: "a", title: "A", minutes: 900, kind: "study" },
      { id: "b", title: "B", minutes: 910, kind: "study" },
    ], G);
    expect(timed.every((t) => t.lanes === 2)).toBe(true);
  });

  it("eventi lontani non si influenzano (lanes torna a 1)", () => {
    // 15:00, 15:05 (affiancato) e 17:00 (da solo)
    const { timed } = positionDayEvents([
      { id: "a", title: "A", minutes: 900, kind: "study" },
      { id: "b", title: "B", minutes: 905, kind: "study" },
      { id: "c", title: "C", minutes: 1020, kind: "study" },
    ], G);
    const c = timed.find((t) => t.id === "c")!;
    expect(c.lanes).toBe(1);
    expect(c.lane).toBe(0);
  });

  it("tre eventi in cascata usano tre colonne", () => {
    const { timed } = positionDayEvents([
      { id: "a", title: "A", minutes: 900, kind: "study" },
      { id: "b", title: "B", minutes: 905, kind: "study" },
      { id: "c", title: "C", minutes: 908, kind: "study" },
    ], G);
    expect(timed.every((t) => t.lanes === 3)).toBe(true);
    expect(timed.map((t) => t.lane).sort()).toEqual([0, 1, 2]);
  });
});
