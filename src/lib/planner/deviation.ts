export type PlanDeviation = "slower" | "faster" | null;

export interface DetectDeviationInput {
  plannedMin: number;
  actualMin: number;
  lessonRatios: readonly number[];
  blockRunning: boolean;
}

/** Deterministic deviation signal for a completed study block. */
export function detectDeviation({
  plannedMin,
  actualMin,
  lessonRatios,
  blockRunning,
}: DetectDeviationInput): PlanDeviation {
  if (blockRunning) return null;

  const recentRatios = lessonRatios.slice(-2);
  const lastTwoAreSlow = recentRatios.length === 2 && recentRatios.every((value) => Number.isFinite(value) && value > 1.3);
  if (actualMin - plannedMin >= 10 || lastTwoAreSlow) return "slower";

  const latestRatio = lessonRatios[lessonRatios.length - 1];
  if (Number.isFinite(latestRatio) && latestRatio < 0.7 && plannedMin - actualMin >= 15) return "faster";

  return null;
}
