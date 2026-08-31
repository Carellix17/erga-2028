import { describe, expect, it } from "vitest";
import {
  deriveCognitiveArchetype,
  UNCALIBRATED_SCORE,
  type CognitiveHexagonScores,
} from "@/lib/cognitiveArchetype";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";

function profile(overrides: Partial<CognitiveProfile>): CognitiveProfile {
  return {
    nome: null,
    eta: null,
    istituto: null,
    log_score: 50,
    mem_score: 50,
    foc_score: 50,
    voc_score: 50,
    ans_score: 50,
    app_score: 50,
    ...overrides,
  };
}

describe("deriveCognitiveArchetype", () => {
  it("restituisce null se il profilo manca (calibrazione non fatta)", () => {
    expect(deriveCognitiveArchetype(null)).toBeNull();
    expect(deriveCognitiveArchetype(undefined)).toBeNull();
  });

  it("restituisce null se tutti i punteggi sono al valore di default", () => {
    expect(deriveCognitiveArchetype(profile({}))).toBeNull();
    expect(UNCALIBRATED_SCORE).toBe(50);
  });

  it("sceglie la dimensione dominante", () => {
    const result = deriveCognitiveArchetype(
      profile({ log_score: 90, mem_score: 60, foc_score: 45, voc_score: 55, ans_score: 70, app_score: 40 }),
    );
    expect(result?.key).toBe("LOG");
  });

  it("in caso di parità vince l'ordine LOG, MEM, FOC, VOC, ANS, APP", () => {
    const result = deriveCognitiveArchetype(
      profile({ log_score: 60, mem_score: 60, foc_score: 60, voc_score: 40, ans_score: 40, app_score: 40 }),
    );
    expect(result?.key).toBe("LOG");
  });

  it("mappa i punteggi nell'ordine visivo dell'esagono", () => {
    const result = deriveCognitiveArchetype(
      profile({ log_score: 10, mem_score: 20, foc_score: 30, voc_score: 40, ans_score: 50, app_score: 60 }),
    );
    const expected: CognitiveHexagonScores = {
      logic: 10,
      memory: 20,
      focus: 30,
      vocabulary: 40,
      calm: 50,
      practice: 60,
    };
    expect(result?.key).toBe("APP");
    expect(result?.scores).toEqual(expected);
  });
});
