import { describe, it, expect } from "vitest";
import {
  MODULE_SIZE,
  moduleIndexOf,
  moduleRange,
  moduleCount,
  isFirstOfModule,
  lessonsInModule,
  missingInModule,
  isModuleFullyMissing,
  isInGatedModule,
  isGateLesson,
  type ModuleLessonLike,
} from "@/lib/lessonModules";

const lesson = (order: number, generated: boolean): ModuleLessonLike => ({
  lesson_order: order,
  is_generated: generated,
});

describe("lessonModules — la libreria dei moduli (P10b)", () => {
  it("la dimensione del vagone resta 4 (allineata col server)", () => {
    expect(MODULE_SIZE).toBe(4);
  });

  it("moduleIndexOf inquadra ogni lezione nel suo modulo", () => {
    expect(moduleIndexOf(0)).toBe(0);
    expect(moduleIndexOf(3)).toBe(0);
    expect(moduleIndexOf(4)).toBe(1);
    expect(moduleIndexOf(7)).toBe(1);
    expect(moduleIndexOf(8)).toBe(2);
  });

  it("moduleRange calcola gli estremi inclusi del vagone", () => {
    expect(moduleRange(0)).toEqual({ start: 0, end: 3 });
    expect(moduleRange(2)).toEqual({ start: 8, end: 11 });
  });

  it("moduleCount conta i vagoni, anche quello finale più corto", () => {
    expect(moduleCount(0)).toBe(0);
    expect(moduleCount(1)).toBe(1);
    expect(moduleCount(4)).toBe(1);
    expect(moduleCount(5)).toBe(2);
    expect(moduleCount(12)).toBe(3);
    expect(moduleCount(13)).toBe(4);
  });

  it("isFirstOfModule riconosce i cancelli dei vagoni", () => {
    expect(isFirstOfModule(0)).toBe(true);
    expect(isFirstOfModule(3)).toBe(false);
    expect(isFirstOfModule(4)).toBe(true);
    expect(isFirstOfModule(8)).toBe(true);
  });

  it("lessonsInModule raccoglie solo le lezioni del vagone (usando lesson_order)", () => {
    const lessons = Array.from({ length: 10 }, (_, i) => lesson(i, false));
    expect(lessonsInModule(lessons, 0).map((l) => l.lesson_order)).toEqual([0, 1, 2, 3]);
    expect(lessonsInModule(lessons, 1).map((l) => l.lesson_order)).toEqual([4, 5, 6, 7]);
    expect(lessonsInModule(lessons, 2).map((l) => l.lesson_order)).toEqual([8, 9]);
    expect(lessonsInModule(lessons, 3)).toEqual([]);
  });

  it("lessonsInModule cade sulla posizione nell'array se manca lesson_order", () => {
    const lessons: ModuleLessonLike[] = [
      { is_generated: true },
      { is_generated: false },
      { is_generated: false },
      { is_generated: false },
      { is_generated: false },
    ];
    expect(lessonsInModule(lessons, 0)).toHaveLength(4);
    expect(lessonsInModule(lessons, 1)).toEqual([{ is_generated: false }]);
  });

  it("missingInModule elenca solo le lezioni da generare", () => {
    const moduleLessons = [lesson(4, true), lesson(5, false), lesson(6, true), lesson(7, false)];
    expect(missingInModule(moduleLessons).map((l) => l.lesson_order)).toEqual([5, 7]);
  });

  it("isModuleFullyMissing: vagone tutto da costruire", () => {
    expect(isModuleFullyMissing([lesson(0, false), lesson(1, false), lesson(2, false), lesson(3, false)])).toBe(true);
  });

  it("isModuleFullyMissing: basta una lezione pronta per smentirlo", () => {
    expect(isModuleFullyMissing([lesson(0, true), lesson(1, false), lesson(2, false), lesson(3, false)])).toBe(false);
  });

  it("isModuleFullyMissing: array vuoto NON è un vagone da costruire", () => {
    expect(isModuleFullyMissing([])).toBe(false);
  });

  it("isModuleFullyMissing: modulo finale corto tutto mancante", () => {
    expect(isModuleFullyMissing([lesson(8, false), lesson(9, false)])).toBe(true);
  });

  it("isInGatedModule: dentro/fuori dal vagone in fabbrica", () => {
    expect(isInGatedModule(5, 1)).toBe(true);
    expect(isInGatedModule(4, 1)).toBe(true);
    expect(isInGatedModule(3, 1)).toBe(false);
    expect(isInGatedModule(8, 1)).toBe(false);
  });

  it("isInGatedModule: senza fabbrica attiva nessun modulo è chiuso", () => {
    expect(isInGatedModule(5, null)).toBe(false);
    expect(isInGatedModule(5, undefined)).toBe(false);
  });

  it("isGateLesson: solo la porta del vagone in fabbrica", () => {
    expect(isGateLesson(4, 1)).toBe(true);
    expect(isGateLesson(5, 1)).toBe(false);
    expect(isGateLesson(0, 0)).toBe(true);
    expect(isGateLesson(4, null)).toBe(false);
    expect(isGateLesson(4, 2)).toBe(false);
  });
});
