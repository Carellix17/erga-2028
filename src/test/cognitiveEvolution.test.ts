import { describe, it, expect } from "vitest";
import { COGNITIVE_QUESTIONS, computeAreaScores } from "@/lib/cognitiveQuestions";
import { buildCognitivePromptAddon, type CognitiveScores } from "../../supabase/functions/_shared/cognitive";

/**
 * 🧪 Esagono cognitivo — collaudo del piano "Evoluzione Esagono Cognitivo":
 * 1) consistency-check in computeAreaScores (risposte "troppo perfette"),
 * 2) buildCognitivePromptAddon a 5 livelli + rilevamento profili paradossali.
 */

const LOG_IDS = COGNITIVE_QUESTIONS.filter((q) => q.area === "LOG").map((q) => q.id);
const MEM_IDS = COGNITIVE_QUESTIONS.filter((q) => q.area === "MEM").map((q) => q.id);

function fullScore(ids: string[], points: number): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, points]));
}

describe("computeAreaScores — consistency-check", () => {
  it("applica lo sconto del 10% quando tutti i punti di un'area sono 10 (varianza 0, media 10)", () => {
    const answers = { ...fullScore(LOG_IDS, 10) };
    const scores = computeAreaScores(answers);
    expect(scores.LOG).toBe(90);
  });

  it("NON applica lo sconto con punteggi uniformi ma non massimi (varianza 0, media < 10)", () => {
    const answers = { ...fullScore(LOG_IDS, 5) };
    const scores = computeAreaScores(answers);
    expect(scores.LOG).toBe(50);
  });

  it("NON applica lo sconto con punti vari (varianza > 0)", () => {
    const answers = { log1: 10, log2: 6, log3: 7 };
    const scores = computeAreaScores(answers);
    // avg = 23/3 ≈ 7.667 → 76.67 → 76.67 * 1 (nessuno sconto) → 77
    expect(scores.LOG).toBe(77);
  });

  it("applica lo sconto per area, non globalmente (le altre aree restano a 0)", () => {
    const answers = { ...fullScore(LOG_IDS, 10) };
    const scores = computeAreaScores(answers);
    expect(scores.MEM).toBe(0);
    expect(scores.APP).toBe(0);
  });

  it("il clamp 0-100 e l'arrotondamento valgono anche con lo sconto", () => {
    const answers = { ...fullScore([...LOG_IDS, ...MEM_IDS], 10) };
    const scores = computeAreaScores(answers);
    expect(scores.LOG).toBe(90);
    expect(scores.MEM).toBe(90);
    expect(scores.LOG).toBeGreaterThanOrEqual(0);
    expect(scores.LOG).toBeLessThanOrEqual(100);
    expect(Number.isInteger(scores.LOG)).toBe(true);
  });
});

describe("buildCognitivePromptAddon — bandizzazione a 5 livelli", () => {
  const base: CognitiveScores = {
    nome: null,
    eta: null,
    istituto: null,
    log_score: 50,
    mem_score: 50,
    foc_score: 50,
    voc_score: 50,
    ans_score: 50,
    app_score: 50,
  };

  it("ritorna stringa vuota con profilo null", () => {
    expect(buildCognitivePromptAddon(null)).toBe("");
  });

  it("mappa i confini delle fasce: 20 critico, 21 basso, 41 medio, 61 buono, 81 eccellente", () => {
    const cases: Array<[number, string]> = [
      [20, "critico"],
      [21, "basso"],
      [40, "basso"],
      [41, "medio"],
      [60, "medio"],
      [61, "buono"],
      [80, "buono"],
      [81, "eccellente"],
      [100, "eccellente"],
    ];
    for (const [score, level] of cases) {
      const p: CognitiveScores = { ...base, log_score: score };
      const out = buildCognitivePromptAddon(p);
      expect(out).toContain(`[LOG ${score}/100 · ${level}]`);
    }
  });

  it("contiene l'header, le 6 regole e le 6 dimensioni", () => {
    const out = buildCognitivePromptAddon(base);
    expect(out).toContain("PERSONALIZZAZIONE COGNITIVA");
    for (const code of ["LOG", "MEM", "FOC", "VOC", "ANS", "APP"]) {
      expect(out).toContain(`[${code} 50/100 · medio]`);
    }
  });

  it("segnala il profilo paradossale LOG↔APP quando |a-b| > 50", () => {
    const p: CognitiveScores = { ...base, log_score: 90, app_score: 30 };
    const out = buildCognitivePromptAddon(p);
    expect(out).toContain("Note aggiuntive:");
    expect(out).toContain("LOG=90 vs APP=30");
  });

  it("non aggiunge note quando tutte le coppie sono entro 50 punti", () => {
    const p: CognitiveScores = { ...base, log_score: 80, app_score: 40, mem_score: 30, voc_score: 90 };
    // LOG↔APP = 40, MEM↔APP = 10, VOC↔LOG = 10 → nessun paradosso
    const out = buildCognitivePromptAddon(p);
    expect(out).not.toContain("Note aggiuntive:");
    expect(out).not.toContain("⚠️");
  });
});
