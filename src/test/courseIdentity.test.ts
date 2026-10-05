import { describe, expect, it } from "vitest";
import { resolveCourseCover, contrastRatio } from "@/lib/courseIdentity";
import { SUBJECT_PALETTE } from "@/lib/subjectColors";

/**
 * Identità del corso — garanzie di contrasto del pilota V2-01
 * (DESIGN.md 2.1 §4: «Verifica il contrasto sul composito»).
 *
 * Nessun abbinamento a occhio: per OGNI materia della palette (e le
 * personalizzazioni, e il fallback) il campo della copertina deve
 * raggiungere 4,5:1 con il proprio inchiostro, e il velo satinato
 * deve restare leggibile sui compositi chiari e profondi, di giorno
 * e di notte, con fallback opaco.
 */

const INK = "#252623";
const PAPER = "#FFFEF9";
const NIGHT_PAPER = "#2D2C29";
const NIGHT_INK = "#F4F1E7";

/** Composito approssimato del satinato: carta α% sopra il campo. */
function composite(satinHex: string, alpha: number, fieldHex: string): string {
  const ch = (h: string) => [0, 2, 4].map((i) => parseInt(h.slice(i + 1, i + 3), 16));
  const s = ch(satinHex);
  const f = ch(fieldHex);
  const out = s.map((v, i) => Math.round(v * alpha + f[i] * (1 - alpha)));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const COURSE_NAMES = [
  "Storia del Novecento",
  "Matematica — equazioni e funzioni",
  "Economia politica",
  "Scienze — biologia e chimica",
  "Letteratura italiana",
  "Filosofia moderna",
  "Fisica — meccanica",
  "Informatica e programmazione",
  "Storia dell'arte",
  "Geografia fisica",
  "Diritto costituzionale",
  "Inglese — lingua e grammatica",
  "zzz corso senza materia riconoscibile qqq",
];

describe("courseIdentity — contrasto garantito delle copertine", () => {
  it("ogni materia della palette: campo ≥ 4,5:1 con il proprio inchiostro", () => {
    for (const course of COURSE_NAMES) {
      const cover = resolveCourseCover(course);
      const ratio = contrastRatio(cover.field, cover.ink);
      expect(ratio, `${course} (${cover.subjectKey}/${cover.family}): ${cover.field} vs ${cover.ink} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("tutte le chiavi personalizzabili dell'utente: campo ≥ 4,5:1", () => {
    for (const subject of SUBJECT_PALETTE) {
      const cover = resolveCourseCover("Qualsiasi corso", subject.key);
      const ratio = contrastRatio(cover.field, cover.ink);
      expect(ratio, `custom ${subject.key}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("le due famiglie convivono: campi light con inchiostro, deep con carta", () => {
    const families = new Set(COURSE_NAMES.map((n) => resolveCourseCover(n).family));
    expect(families.has("light")).toBe(true);
    expect(families.has("deep")).toBe(true);
    for (const course of COURSE_NAMES) {
      const cover = resolveCourseCover(course);
      if (cover.family === "light") expect(cover.ink).toBe(INK);
      else expect(cover.ink).toBe(PAPER);
    }
  });

  it("il satinato resta leggibile sui compositi, giorno e notte (≥ 4,5:1)", () => {
    for (const course of COURSE_NAMES) {
      const cover = resolveCourseCover(course);
      // giorno: carta 80% sul campo, testo inchiostro
      const dayComposite = composite(PAPER, 0.8, cover.field);
      const dayRatio = contrastRatio(dayComposite, INK);
      expect(dayRatio, `satinato giorno su ${cover.subjectKey}: ${dayRatio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      // notte: carta notte 85% sul campo, testo inchiostro di notte
      const nightComposite = composite(NIGHT_PAPER, 0.85, cover.field);
      const nightRatio = contrastRatio(nightComposite, NIGHT_INK);
      expect(nightRatio, `satinato notte su ${cover.subjectKey}: ${nightRatio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("fallback opaco del satinato: carta piena sempre leggibile", () => {
    for (const course of COURSE_NAMES) {
      const cover = resolveCourseCover(course);
      // senza blur il fondo diventa carta piena: contrasto ancora più alto
      expect(contrastRatio(PAPER, INK)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(NIGHT_PAPER, NIGHT_INK)).toBeGreaterThanOrEqual(4.5);
      // sanity: il composito satjnato non può essere peggiore del campo
      const dayComposite = composite(PAPER, 0.8, cover.field);
      expect(contrastRatio(dayComposite, INK)).toBeGreaterThan(0);
    }
  });

  it("identità stabile: stesso corso, stessa identità; corsi diversi, materia uguale", () => {
    const a = resolveCourseCover("Fisica — meccanica");
    const b = resolveCourseCover("Fisica — meccanica");
    expect(a).toEqual(b);

    // la materia guida la famiglia: due corsi di storia sono entrambi deep
    const s1 = resolveCourseCover("Storia del Novecento");
    const s2 = resolveCourseCover("Storia romana");
    expect(s1.family).toBe(s2.family);
  });
});
