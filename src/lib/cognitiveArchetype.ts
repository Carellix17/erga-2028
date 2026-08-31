import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";

/**
 * Derivazione dell'archetipo cognitivo dai punteggi reali dell'esagono.
 * Funzioni pure: nessun dato inventato, solo lettura del profilo salvato.
 */

/** Punteggi 0-100 delle sei dimensioni, nell'ordine visivo dell'esagono. */
export interface CognitiveHexagonScores {
  logic: number;
  memory: number;
  focus: number;
  vocabulary: number;
  calm: number;
  practice: number;
}

export type ArchetypeKey = "LOG" | "MEM" | "FOC" | "VOC" | "ANS" | "APP";

export interface CognitiveArchetype {
  key: ArchetypeKey;
  scores: CognitiveHexagonScores;
}

const KEYS: ArchetypeKey[] = ["LOG", "MEM", "FOC", "VOC", "ANS", "APP"];

/** Il valore predefinito assegnato a chi non ha ancora calibrato il profilo. */
export const UNCALIBRATED_SCORE = 50;

/**
 * Restituisce l'archetipo dominante (punteggio più alto) con i punteggi
 * mappati per l'esagono. Parità → primo in ordine LOG, MEM, FOC, VOC, ANS, APP.
 * Restituisce null se il profilo manca o è ancora tutto al valore di default
 * (calibrazione non completata): in quel caso la UI invita a calibrare.
 */
export function deriveCognitiveArchetype(
  profile: CognitiveProfile | null | undefined,
): CognitiveArchetype | null {
  if (!profile) return null;

  const scores: CognitiveHexagonScores = {
    logic: profile.log_score,
    memory: profile.mem_score,
    focus: profile.foc_score,
    vocabulary: profile.voc_score,
    calm: profile.ans_score,
    practice: profile.app_score,
  };

  const values = [scores.logic, scores.memory, scores.focus, scores.vocabulary, scores.calm, scores.practice];
  const isUncalibrated = values.every((value) => value === UNCALIBRATED_SCORE);
  if (isUncalibrated) return null;

  let dominant: ArchetypeKey = KEYS[0];
  let dominantScore = values[0];
  for (let i = 1; i < KEYS.length; i++) {
    if (values[i] > dominantScore) {
      dominant = KEYS[i];
      dominantScore = values[i];
    }
  }

  return { key: dominant, scores };
}
