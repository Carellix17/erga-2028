import { describe, it, expect } from "vitest";
import {
  prepareExercise,
  prepareLessonExercises,
  seedFromString,
} from "@/lib/lessonExercises";
import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

/**
 * P50 — La posizione della risposta non è più un indizio.
 * Contratto: opzioni mescolate, risposta giusta invariata, ordine STABILE
 * (stesso esercizio → stesso ordine) e nessun danno sui dati strani.
 */

const mc = (over: Partial<Exercise> = {}): Exercise => ({
  type: "multiple_choice",
  question: "Quale gas assorbono le piante?",
  options: ["Ossigeno", "Anidride carbonica", "Azoto", "Elio"],
  correct_index: 1,
  ...over,
});

describe("P50 esercizi delle lezioni — mescolamento delle opzioni", () => {
  it("mescola le opzioni e rimappa correct_index sulla stessa risposta", () => {
    const original = mc();
    const prepared = prepareExercise(original);

    expect(prepared.options).not.toEqual(original.options);
    expect([...prepared.options!].sort()).toEqual([...original.options!].sort());
    expect(prepared.options![prepared.correct_index!]).toBe(
      original.options![original.correct_index!],
    );
  });

  it("non lascia MAI la risposta dove l'aveva scritta l'AI (garanzia di spostamento)", () => {
    // 40 esercizi diversi: nessuno deve conservare l'ordine originale.
    for (let i = 0; i < 40; i++) {
      const original = mc({ question: `Domanda numero ${i}?` });
      const prepared = prepareExercise(original);
      expect(prepared.options).not.toEqual(original.options);
    }
  });

  it("è DETERMINISTICO: lo stesso esercizio ha sempre lo stesso ordine", () => {
    const a = prepareExercise(mc());
    const b = prepareExercise(mc());
    expect(b.options).toEqual(a.options);
    expect(b.correct_index).toBe(a.correct_index);
  });

  it("sali diversi danno ordini diversi (lezione ≠ test finale)", () => {
    const inLezione = prepareExercise(mc(), "lezione-1#0");
    const nelTest = prepareExercise(mc(), "test-finale#0");
    expect(nelTest.options).not.toEqual(inLezione.options);
  });

  it("lascia intatti vero/falso e altri tipi", () => {
    const tf: Exercise = { type: "true_false", statement: "Serve la luce.", correct: true };
    expect(prepareExercise(tf)).toEqual(tf);
  });

  it("lascia intatti gli esercizi malformati (fallback pulito)", () => {
    const fuoriIntervallo = mc({ correct_index: 9 });
    expect(prepareExercise(fuoriIntervallo)).toEqual(fuoriIntervallo);

    const senzaIndice = mc({ correct_index: undefined });
    expect(prepareExercise(senzaIndice)).toEqual(senzaIndice);

    const unaSolaOpzione = mc({ options: ["Unica"], correct_index: 0 });
    expect(prepareExercise(unaSolaOpzione)).toEqual(unaSolaOpzione);
  });

  it("prepareLessonExercises gestisce liste mancanti e preserva l'ordine degli esercizi", () => {
    expect(prepareLessonExercises(undefined)).toEqual([]);
    expect(prepareLessonExercises([])).toEqual([]);

    const list = [mc(), { type: "true_false" as const, statement: "Ok", correct: false }];
    const prepared = prepareLessonExercises(list, "lezione-9");
    expect(prepared).toHaveLength(2);
    expect(prepared[0].type).toBe("multiple_choice");
    expect(prepared[1]).toEqual(list[1]);
  });

  it("due esercizi identici nella stessa lezione non ricevono lo stesso ordine", () => {
    const list = [mc(), mc()];
    const [first, second] = prepareLessonExercises(list, "lezione-x");
    expect(second.options).not.toEqual(first.options);
  });

  it("seedFromString è stabile e sensibile alla stringa", () => {
    expect(seedFromString("ciao")).toBe(seedFromString("ciao"));
    expect(seedFromString("ciao")).not.toBe(seedFromString("ciaoo"));
  });
});
