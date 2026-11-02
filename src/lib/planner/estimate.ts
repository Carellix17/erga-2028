import type { SubjectType } from "./subjectType";

/** Default reading rates, in words per minute, by planner subject type. */
export const V: Readonly<Record<SubjectType, number>> = {
  scientifico: 80,
  lingue: 90,
  umanistico: 120,
  generale: 100,
};

/** Default exercise durations, in minutes per exercise, by planner subject type. */
export const E: Readonly<Record<SubjectType, number>> = {
  scientifico: 2,
  lingue: 1.5,
  umanistico: 1,
  generale: 1.5,
};

export type EstimateSource = "default" | "measured_text";

export interface BaseMinutesEstimate {
  minutes: number;
  source: EstimateSource;
}

/** Estimates lesson minutes without consulting the clock, network, or database. */
export function baseMinutes(
  words: number | null,
  exercises: number | null,
  type: SubjectType,
  contextMedianWords?: number | null,
): BaseMinutesEstimate {
  const source: EstimateSource = words === null ? "default" : "measured_text";
  const wordCount = words ?? contextMedianWords ?? 490;
  const exerciseCount = exercises ?? 4;
  const minutes = Math.max(3, Math.round(wordCount / V[type] + exerciseCount * E[type]));

  return { minutes, source };
}
