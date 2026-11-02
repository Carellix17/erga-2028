import { describe, expect, it } from "vitest";
import { detectDeviation } from "@/lib/planner/deviation";

describe("detectDeviation", () => {
  it("does not react while the block is still running", () => {
    expect(detectDeviation({ plannedMin: 40, actualMin: 70, lessonRatios: [1.5, 1.6], blockRunning: true })).toBeNull();
  });

  it("reports slower for an overrun of at least ten minutes", () => {
    expect(detectDeviation({ plannedMin: 40, actualMin: 50, lessonRatios: [], blockRunning: false })).toBe("slower");
    expect(detectDeviation({ plannedMin: 40, actualMin: 49, lessonRatios: [], blockRunning: false })).toBeNull();
  });

  it("reports slower after two consecutive lesson ratios over 1.3", () => {
    expect(detectDeviation({ plannedMin: 60, actualMin: 60, lessonRatios: [1.4, 1.31], blockRunning: false })).toBe("slower");
    expect(detectDeviation({ plannedMin: 60, actualMin: 60, lessonRatios: [1.4, 1.2, 1.4], blockRunning: false })).toBeNull();
  });

  it("reports faster only when a ratio is below 0.7 and the block finishes at least 15 minutes early", () => {
    expect(detectDeviation({ plannedMin: 60, actualMin: 45, lessonRatios: [0.69], blockRunning: false })).toBe("faster");
    expect(detectDeviation({ plannedMin: 60, actualMin: 46, lessonRatios: [0.5], blockRunning: false })).toBeNull();
    expect(detectDeviation({ plannedMin: 60, actualMin: 40, lessonRatios: [0.7], blockRunning: false })).toBeNull();
  });
});
