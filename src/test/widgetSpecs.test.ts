import { describe, it, expect } from "vitest";
import {
  WIDGET_REGISTRY,
  WIDGET_MAP,
  sanitizeWidgetSpec,
  widgetParamValue,
  widgetTitle,
  type WidgetType,
} from "../lib/widgets";
import { buildScientificLessonPrompt } from "../../supabase/functions/_shared/subjects";

// 🎛️ PERCORSI 2.0 — collaudo del catalogo widget e del bigliettino dell'AI.
// L'AI non può rompere la lezione: valori fuori scala vengono riportati
// dentro, le chiavi sconosciute buttate, i tipi sconosciuti rifiutati.

describe("🎛️ sanitizeWidgetSpec — il bigliettino a prova di AI", () => {
  it("parametri piatti (il formato che il prompt chiede all'AI)", () => {
    const spec = sanitizeWidgetSpec({ type: "parabola", a: 2, b: -1, c: 4, caption: "Osserva il vertice" });
    expect(spec).toEqual({
      type: "parabola",
      params: { a: 2, b: -1, c: 4 },
      caption: "Osserva il vertice",
    });
  });

  it("accetta anche i parametri annidati (l'AI a volte inventa)", () => {
    const spec = sanitizeWidgetSpec({ type: "retta", params: { m: 3, q: -2 } });
    expect(spec?.params).toEqual({ m: 3, q: -2 });
  });

  it("valori fuori scala vengono riportati dentro i limiti", () => {
    const spec = sanitizeWidgetSpec({ type: "parabola", a: 999, b: -9999, c: 42 });
    expect(spec?.params).toEqual({ a: 5, b: -10, c: 10 });
  });

  it("valori mancanti o non numerici → default del catalogo", () => {
    const spec = sanitizeWidgetSpec({ type: "proiettile", v0: "veloce", angolo: null });
    expect(spec?.params).toEqual({ v0: 20, angolo: 45 });
  });

  it("tipo sconosciuto o spazzatura → null (niente widget, slide illesa)", () => {
    expect(sanitizeWidgetSpec({ type: "bomba", a: 1 })).toBeNull();
    expect(sanitizeWidgetSpec("parabola")).toBeNull();
    expect(sanitizeWidgetSpec(null)).toBeNull();
    expect(sanitizeWidgetSpec([1, 2])).toBeNull();
    expect(sanitizeWidgetSpec({})).toBeNull();
  });

  it("caption potato a 140 caratteri e ripulito", () => {
    const spec = sanitizeWidgetSpec({ type: "ph", ph: 4, caption: "   " + "x".repeat(200) });
    expect(spec?.caption).toHaveLength(140);
  });

  it("il codice è accettato SOLO per il widget 'codice' (max 2000)", () => {
    const ok = sanitizeWidgetSpec({ type: "codice", code: "console.log(1)" });
    expect(ok?.code).toBe("console.log(1)");
    const no = sanitizeWidgetSpec({ type: "parabola", a: 1, code: "console.log(1)" });
    expect(no?.code).toBeUndefined();
    const lungo = sanitizeWidgetSpec({ type: "codice", code: "x".repeat(3000) });
    expect(lungo?.code).toHaveLength(2000);
  });
});

describe("🎛️ il catalogo è coerente", () => {
  it("ogni widget ha tipi unici e parametri sensati", () => {
    const types = new Set<string>();
    for (const w of WIDGET_REGISTRY) {
      expect(types.has(w.type)).toBe(false);
      types.add(w.type);
      for (const p of w.params) {
        expect(p.min).toBeLessThan(p.max);
        expect(p.step).toBeGreaterThan(0);
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
        expect(p.label.it.length).toBeGreaterThan(0);
        expect(p.label.en.length).toBeGreaterThan(0);
      }
    }
  });

  it("widgetParamValue difende i limiti anche con un piano manomesso", () => {
    const spec = { type: "parabola" as WidgetType, params: { a: 999 } };
    expect(widgetParamValue(spec, "a")).toBe(5);
    expect(widgetParamValue(spec, "b")).toBe(0);
  });

  it("i titoli esistono in entrambe le lingue", () => {
    expect(widgetTitle("parabola", "it")).toBe("Parabola");
    expect(widgetTitle("mercato", "en")).toBe("Supply and demand");
  });
});

describe("🎛️ prompt e catalogo non divergono MAI", () => {
  const prompt = buildScientificLessonPrompt({
    title: "Equazioni di secondo grado",
    profileContext: "",
    pageRangeInfo: "",
    figureInstructions: "",
    studyContent: "MATERIALE",
  });

  it("ogni widget scientifico del catalogo è Presente nel prompt col suo nome", () => {
    for (const w of WIDGET_REGISTRY) {
      if (w.scientific) expect(prompt).toContain(w.type);
    }
  });

  it("il contratto del blocco ```widget è spiegato", () => {
    expect(prompt).toContain("```widget");
    expect(prompt).toContain("massimo UNO");
    expect(prompt).toContain("caption");
  });

  it("l'esecutore di codice NON è offerto alle materie scientifiche", () => {
    expect(prompt).not.toContain('"codice"');
  });

  it("i parametri chiave del catalogo compaiono nel prompt (intervalli allineati)", () => {
    expect(prompt).toContain("a (-5..5)");
    expect(prompt).toContain("v0 (1..50");
    expect(prompt).toContain("ph (0..14)");
    expect(WIDGET_MAP.ph.params[0].min).toBe(0);
  });
});
