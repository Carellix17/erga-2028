import { describe, it, expect } from "vitest";
import {
  parseExerciseSet,
  checkAnswer,
  buildGymPrompt,
  GYM_SYSTEM_MESSAGE,
  type ScientificExercise,
} from "../../supabase/functions/_shared/scientificGym";

// 🏋️ PERCORSI 2.0 — collaudo della logica della palestra scientifica.
// L'AI non può rompere niente: esercizi senza risposta numerica vengono
// scartati, tolleranze insane raddrizzate, tutto potato ai limiti.

const baseExercise = {
  kind: "drill",
  topic: "Cinematica",
  text: "Un'auto accelera a $2\\,m/s^2$ per $4\\,s$: quale velocità raggiunge (in m/s)?",
  answer: 8,
  unit: "m/s",
  tolerance: 0.01,
  steps: ["v = a \\cdot t", "v = 2 \\cdot 4 = 8\\,m/s"],
  hints: ["Quale formula lega v, a e t?"],
};

describe("🏋️ parseExerciseSet — l'AI non può rompere la palestra", () => {
  it("array JSON pulito → esercizi validi con id assegnati", () => {
    const set = parseExerciseSet(JSON.stringify([baseExercise, { ...baseExercise, kind: "problem" }]), 5);
    expect(set).toHaveLength(2);
    expect(set[0].id).toBe("ex-1");
    expect(set[0].answerValue).toBe(8);
    expect(set[0].answerUnit).toBe("m/s");
    expect(set[1].kind).toBe("problem");
  });

  it("tollera recinti di codice e testo attorno", () => {
    const raw = "Ecco gli esercizi:\n```json\n" + JSON.stringify([baseExercise]) + "\n```\nBuono studio!";
    expect(parseExerciseSet(raw, 3)).toHaveLength(1);
  });

  it("accetta anche {exercises: [...]} come involucro", () => {
    const raw = JSON.stringify({ exercises: [baseExercise] });
    expect(parseExerciseSet(raw, 3)).toHaveLength(1);
  });

  it("senza risposta numerica l'esercizio è SCARTATO", () => {
    const senza = [{ ...baseExercise, answer: "otto" }, baseExercise];
    const set = parseExerciseSet(JSON.stringify(senza), 3);
    expect(set).toHaveLength(1);
  });

  it("tolleranza mancante o assurda → default sana (2% del valore)", () => {
    const set = parseExerciseSet(JSON.stringify([{ ...baseExercise, tolerance: -5 }]), 3);
    expect(set[0].tolerance).toBeCloseTo(0.16, 5); // 2% di 8
    const { tolerance: _omit, ...senzaTolleranza } = baseExercise;
    const set2 = parseExerciseSet(JSON.stringify([senzaTolleranza]), 3);
    expect(set2[0].tolerance).toBeCloseTo(0.16, 5);
  });

  it("tolleranza enorme viene limitata", () => {
    const set = parseExerciseSet(JSON.stringify([{ ...baseExercise, tolerance: 1000 }]), 3);
    expect(set[0].tolerance).toBeLessThanOrEqual(8 * 0.25 + 1);
  });

  it("steps e hints vengono potato e tassati", () => {
    const rumore = {
      ...baseExercise,
      steps: ["", "passo valido", ...Array(12).fill("passo in più")],
      hints: ["", "un suggerimento", ...Array(5).fill("troppo")],
    };
    const set = parseExerciseSet(JSON.stringify([rumore]), 3);
    expect(set[0].steps.length).toBeLessThanOrEqual(8);
    expect(set[0].hints.length).toBeLessThanOrEqual(3);
    expect(set[0].steps).not.toContain("");
  });

  it("rispetta il tetto massimo e non lanci mai su spazzatura", () => {
    expect(parseExerciseSet("boh", 5)).toEqual([]);
    expect(parseExerciseSet("", 5)).toEqual([]);
    expect(parseExerciseSet(JSON.stringify(Array(20).fill(baseExercise)), 5)).toHaveLength(5);
  });

  it("steps mancanti → almeno il risultato finale come passo", () => {
    const set = parseExerciseSet(JSON.stringify([{ ...baseExercise, steps: undefined }]), 3);
    expect(set[0].steps).toEqual(["8"]);
  });
});

describe("🏋️ checkAnswer — il confronto tollerante", () => {
  const ex: ScientificExercise = {
    id: "ex-1", kind: "drill", topic: "t", text: "t",
    answerValue: 9.81, answerUnit: "m/s²", tolerance: 0.05,
    steps: ["…"], hints: [],
  };

  it("dentro tolleranza → corretto (anche al limite)", () => {
    expect(checkAnswer(9.81, ex)).toBe(true);
    expect(checkAnswer(9.86, ex)).toBe(true);
    expect(checkAnswer(9.76, ex)).toBe(true);
  });

  it("fuori tolleranza → sbagliato", () => {
    expect(checkAnswer(9.9, ex)).toBe(false);
    expect(checkAnswer(10, ex)).toBe(false);
  });

  it("NaN mai corretto", () => {
    expect(checkAnswer(Number.NaN, ex)).toBe(false);
    expect(checkAnswer(Number.POSITIVE_INFINITY, ex)).toBe(false);
  });
});

describe("🏋️ buildGymPrompt — il contratto col cervello", () => {
  const prompt = buildGymPrompt({
    subject: "Fisica",
    topicsSummary: "1. Il moto rettilineo — uniforme e accelerato",
    materialSlice: "MATERIALE: un corpo parte da fermo…",
    count: 5,
    profileContext: "\nProfilo: APP medio.",
    moduleLabel: "modulo 1",
  });

  it("materia, argomenti, materiale e profilo passano al prompt", () => {
    expect(prompt).toContain("Fisica");
    expect(prompt).toContain("Il moto rettilineo");
    expect(prompt).toContain("un corpo parte da fermo");
    expect(prompt).toContain("APP medio");
    expect(prompt).toContain("modulo 1");
  });

  it("le regole d'oro: risposta numerica univoca, mix drill/problem, hint progressivi", () => {
    expect(prompt).toContain("UNA SOLA risposta numerica univoca");
    expect(prompt).toContain('"kind": "drill"');
    expect(prompt).toContain('"kind": "problem"');
    expect(prompt).toContain("PROGRESSIVI");
    expect(prompt).toContain("MAI il risultato");
    expect(prompt).toContain("soluzione PASSO-PASSO");
  });

  it("senza materiale la sezione sparisce (niente blocco vuoto)", () => {
    const p2 = buildGymPrompt({
      subject: "Matematica", topicsSummary: "1. x", materialSlice: "",
      count: 5, profileContext: "", moduleLabel: "tutto",
    });
    expect(p2).not.toContain("STRALCIO DEL MATERIALE");
  });

  it("il messaggio di sistema chiede solo JSON e LaTeX", () => {
    expect(GYM_SYSTEM_MESSAGE).toContain("array JSON");
    expect(GYM_SYSTEM_MESSAGE).toContain("LaTeX");
    expect(GYM_SYSTEM_MESSAGE).toContain("risposta numerica univoca");
  });
});
