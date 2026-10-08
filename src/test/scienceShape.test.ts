import { describe, it, expect } from "vitest";
import {
  scienceShapeIssues,
  buildScientificLessonPrompt,
  SCIENTIFIC_SYSTEM_MESSAGE,
} from "../../supabase/functions/_shared/subjects";

/**
 * 📏 P6 — Il verificatore della forma: il prompt scientifico impone tetti
 * (formule in mostra, lunghezza) che nessuno controllava. Questi test
 * fissano cosa significa «lezione-mostra» (il sintomo c del proprietario).
 */
describe("scienceShapeIssues — il verificatore della lezione scientifica (P6)", () => {
  const part = (content: string) => ({ content });

  it("lezione nella norma: nessuna segnalazione", () => {
    const parts = [
      part("Slide con $$x = \\frac{a}{b}$$ e spiegazione attorno " + "parola ".repeat(40)),
      part("Altro passo con $$E = mc^2$$ e testo attorno " + "termine ".repeat(40)),
    ];
    expect(scienceShapeIssues(parts)).toEqual([]);
  });

  it("lezione-mostro con decine di formule in mostra: segnalata", () => {
    const mostro = part(
      Array.from({ length: 12 }, (_, i) => `$$f_{${i}} = ${i}x$$`).join(" testo tra le formule "),
    );
    const issues = scienceShapeIssues([mostro]);
    expect(issues.some((i) => i.includes("formule in mostra"))).toBe(true);
  });

  it("lezione-mille-parole: segnalata", () => {
    const lunga = part("parola ".repeat(900));
    const issues = scienceShapeIssues([lunga]);
    expect(issues.some((i) => i.includes("lunghezza"))).toBe(true);
  });

  it("lezione-mostro completa: entrambe le violazioni insieme", () => {
    const mostro = part(
      Array.from({ length: 9 }, (_, i) => `$$g_{${i}}$$`).join(" ") + " " + "parola ".repeat(900),
    );
    expect(scienceShapeIssues([mostro])).toHaveLength(2);
  });

  it("i dollari inline ($…$) NON contano come formule in mostra", () => {
    const inline = part("$a$ e $b$ e $c$ restano inline, il testo prosegue " + "parola ".repeat(30));
    expect(scienceShapeIssues([inline])).toEqual([]);
  });

  it("il tetto è scritto nel prompt della lezione e nel messaggio di sistema", () => {
    const prompt = buildScientificLessonPrompt({
      title: "Titolo di prova",
      profileContext: "",
      pageRangeInfo: "",
      figureInstructions: "",
      studyContent: "Materiale di prova",
    });
    expect(prompt).toContain("MASSIMO 4 formule in mostra");
    expect(SCIENTIFIC_SYSTEM_MESSAGE).toContain("massimo 4 formule in mostra");
  });
});
