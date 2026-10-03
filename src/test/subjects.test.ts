import { describe, it, expect } from "vitest";
import {
  detectSubjectHeuristic,
  parseDetectorResult,
  detectSubject,
  buildDetectorPrompt,
  buildScientificLessonPrompt,
  isScientificFamily,
  SCIENTIFIC_SYSTEM_MESSAGE,
  SUBJECT_FAMILIES,
} from "../../supabase/functions/_shared/subjects";

// 🧭 PERCORSI 2.0 — collaudo del rilevatore di materia e delle regole
// scientifiche. Il rilevatore non deve MAI bloccare la generazione.

describe("🧭 euristica (costo zero)", () => {
  it("file di fisica riconosciuto dalle sole parole chiave", () => {
    const d = detectSubjectHeuristic("Fisica_cinematica.pdf", "moto rettilineo uniforme");
    expect(d?.family).toBe("scientifiche");
    expect(d?.source).toBe("heuristic");
  });

  it("nome ambiguo senza segnali → null (serve l'AI)", () => {
    expect(detectSubjectHeuristic("appunti.pdf", "cose varie scritte di fretta")).toBeNull();
  });

  it("un solo segnale debole non basta", () => {
    expect(detectSubjectHeuristic("documento.pdf", "un accenno di storia")).toBeNull();
  });

  it("filosofia in inglese NON finisce nelle scientifiche (niente falsi positivi 'ph')", () => {
    const d = detectSubjectHeuristic("philosophy_notes.pdf", "plato and aristotle");
    expect(d?.family).toBe("filosofia");
  });
});

describe("🧭 parsing del verdetto AI", () => {
  it("JSON pulito", () => {
    const d = parseDetectorResult('{"family":"scientifiche","subject":"Fisica","confidence":85}');
    expect(d).toEqual({ family: "scientifiche", subject: "Fisica", confidence: 85, source: "ai" });
  });

  it("JSON dentro recinto di codice", () => {
    const d = parseDetectorResult('```json\n{"family":"storiche","subject":"Storia","confidence":70}\n```');
    expect(d?.family).toBe("storiche");
  });

  it("famiglia sconosciuta → null", () => {
    expect(parseDetectorResult('{"family":"alchimia","subject":"x","confidence":90}')).toBeNull();
  });

  it("spazzatura → null", () => {
    expect(parseDetectorResult("boh")).toBeNull();
    expect(parseDetectorResult("")).toBeNull();
  });

  it("confidence fuori scala viene riportata dentro 0-100", () => {
    expect(parseDetectorResult('{"family":"arte","subject":"Arte","confidence":250}')?.confidence).toBe(100);
    expect(parseDetectorResult('{"family":"arte","subject":"Arte","confidence":-10}')?.confidence).toBe(0);
  });
});

describe("🧭 detectSubject — l'orchestrazione completa", () => {
  it("scientifiche forti dall'euristica → NESSUNA chiamata AI (risparmio)", async () => {
    let called = 0;
    const d = await detectSubject({
      fileName: "Matematica_equazioni.pdf",
      sample: "risoluzione di equazioni e studio della parabola",
      aiCall: async () => { called++; return ""; },
    });
    expect(d.family).toBe("scientifiche");
    expect(called).toBe(0);
  });

  it("caso ambiguo → chiama l'AI e le crede", async () => {
    const d = await detectSubject({
      fileName: "appunti.pdf",
      sample: "testo vario",
      aiCall: async () => '{"family":"filosofia","subject":"Filosofia","confidence":90}',
    });
    expect(d.family).toBe("filosofia");
    expect(d.source).toBe("ai");
  });

  it("AI giù → ricade su 'generale', MAI errore", async () => {
    const d = await detectSubject({
      fileName: "appunti.pdf",
      sample: "parole qualunque",
      aiCall: async () => { throw new Error("servizio giù"); },
    });
    expect(d.family).toBe("generale");
  });

  it("AI che risponde spazzatura → 'generale'", async () => {
    const d = await detectSubject({ fileName: "x.pdf", sample: "y", aiCall: async () => "non so" });
    expect(d.family).toBe("generale");
  });

  it("il prompt del rilevatore elenca le famiglie e mostra il campione", () => {
    const p = buildDetectorPrompt("Fisica.pdf", "moto, forze, energia");
    expect(p).toContain("scientifiche");
    expect(p).toContain("moto, forze, energia");
    expect(p).toContain("Fisica.pdf");
  });
});

describe("🧭 il vestito scientifico (formule in primo piano)", () => {
  const base = {
    title: "Equazioni di secondo grado",
    profileContext: "",
    pageRangeInfo: "",
    figureInstructions: "",
    studyContent: "MATERIALE…",
  };

  it("isScientificFamily distingue le famiglie", () => {
    expect(isScientificFamily("scientifiche")).toBe(true);
    expect(isScientificFamily("letteratura")).toBe(false);
    expect(isScientificFamily(null)).toBe(false);
    expect(isScientificFamily(undefined)).toBe(false);
  });

  it("il messaggio di sistema chiede LaTeX e anatomia della formula", () => {
    expect(SCIENTIFIC_SYSTEM_MESSAGE).toContain("$$");
    expect(SCIENTIFIC_SYSTEM_MESSAGE).toContain("ANATOMIA");
    expect(SCIENTIFIC_SYSTEM_MESSAGE).toContain("ESEMPIO SVOLTO");
  });

  it("il prompt contiene le regole chiave e il titolo", () => {
    const p = buildScientificLessonPrompt(base);
    expect(p).toContain("Equazioni di secondo grado");
    expect(p).toContain("$$");
    expect(p).toContain("ANATOMIA");
    expect(p).toContain("esempio svolto PASSO-PASSO");
    expect(p).toContain("unità di misura");
    expect(p).toContain("explanation");
    expect(p).toContain("MATERIALE…");
  });

  it("le figure entrano nel prompt quando previste, e restano fuori quando non ci sono", () => {
    const conFigure = buildScientificLessonPrompt({ ...base, figureInstructions: "FIGURE DAL PDF: token [FIG:0]" });
    expect(conFigure).toContain("[FIG:0]");
    expect(conFigure).toContain("6) FIGURE");
    const senzaFigure = buildScientificLessonPrompt(base);
    expect(senzaFigure).not.toContain("6) FIGURE");
  });

  it("profilo e intervallo pagine passano al vestito scientifico", () => {
    const p = buildScientificLessonPrompt({ ...base, profileContext: "\nProfilo: LOG alto.", pageRangeInfo: "\nPagine 3-5." });
    expect(p).toContain("Profilo: LOG alto.");
    expect(p).toContain("Pagine 3-5.");
  });

  it("l'elenco famiglie è quello della Matrice delle Materie", () => {
    expect(SUBJECT_FAMILIES).toContain("scientifiche");
    expect(SUBJECT_FAMILIES).toContain("latino");
    expect(SUBJECT_FAMILIES).toContain("generale");
    expect(SUBJECT_FAMILIES).toHaveLength(10);
  });
});
