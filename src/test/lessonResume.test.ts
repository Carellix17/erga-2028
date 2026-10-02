import { describe, it, expect, beforeEach } from "vitest";
import {
  readLessonResume,
  saveLessonResume,
  clearLessonResume,
} from "@/lib/lessonResume";

/**
 * P50 — «Dov'ero rimasto?» dentro la lezione (memoria sul dispositivo).
 * Contratto: si salva solo oltre la prima slide, si legge se è fresca,
 * un dato corrotto o scaduto non fa mai esplodere la lezione.
 */

const ID = "lezione-42";
const KEY = `erga:lesson-resume:${ID}`;

describe("P50 memoria della slide", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("salva e rilegge la posizione", () => {
    saveLessonResume(ID, 3, 1_000_000);
    expect(readLessonResume(ID, 1_000_000)).toEqual({ step: 3, savedAt: 1_000_000 });
  });

  it("non salva la prima slide (non c'è niente da riprendere)", () => {
    saveLessonResume(ID, 0, 1_000_000);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(readLessonResume(ID, 1_000_000)).toBeNull();
  });

  it("dimentica dopo 30 giorni", () => {
    const giorno = 24 * 60 * 60 * 1000;
    saveLessonResume(ID, 2, 0);
    expect(readLessonResume(ID, 29 * giorno)?.step).toBe(2);
    expect(readLessonResume(ID, 31 * giorno)).toBeNull();
    // e ripulisce la chiave scaduta
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("ignora dati corrotti senza lanciare", () => {
    window.localStorage.setItem(KEY, "{questo non è json");
    expect(readLessonResume(ID)).toBeNull();

    window.localStorage.setItem(KEY, JSON.stringify({ step: "due", savedAt: Date.now() }));
    expect(readLessonResume(ID)).toBeNull();

    window.localStorage.setItem(KEY, JSON.stringify({ step: -4, savedAt: Date.now() }));
    expect(readLessonResume(ID)).toBeNull();
  });

  it("clearLessonResume dimentica la posizione (percorso completato)", () => {
    saveLessonResume(ID, 5, 1_000_000);
    clearLessonResume(ID);
    expect(readLessonResume(ID, 1_000_000)).toBeNull();
  });

  it("lezioni diverse non si confondono", () => {
    saveLessonResume("a", 2, 1_000_000);
    saveLessonResume("b", 6, 1_000_000);
    expect(readLessonResume("a", 1_000_000)?.step).toBe(2);
    expect(readLessonResume("b", 1_000_000)?.step).toBe(6);
  });
});
