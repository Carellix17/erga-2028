import { describe, expect, it } from "vitest";
import {
  calculateSpeedFactor,
  estimateMinutes,
  ratio,
  type ReadingSpeedSample,
} from "@/lib/planner/speed";

const AS_OF = "2026-11-02T12:00:00.000Z";
const BASE_TIME = Date.parse("2026-11-01T12:00:00.000Z");

function makeSample(
  subject: string | null,
  subjectType: string | null,
  activeSeconds: number,
  baseEstimateMin = 10,
  index = 0,
): ReadingSpeedSample {
  return {
    subject,
    subject_type: subjectType,
    active_seconds: activeSeconds,
    base_estimate_min: baseEstimateMin,
    completed_at: new Date(BASE_TIME + index * 60_000).toISOString(),
  };
}

describe("reading speed factors", () => {
  it("uses neutral defaults when there are no samples", () => {
    expect(calculateSpeedFactor("Matematica", "scientifico", [], AS_OF)).toEqual({
      factor: 1,
      n: 0,
      explanation: { subject: "Matematica", factor: 1, n: 0 },
    });
  });

  it("smooths five subject samples at 1.4 toward the default type factor", () => {
    const samples = Array.from({ length: 5 }, (_, index) =>
      makeSample("Matematica", "scientifico", 840, 10, index),
    );
    const result = calculateSpeedFactor("Matematica", "scientifico", samples, AS_OF);

    expect(ratio(samples[0])).toBe(1.4);
    expect(result.factor).toBeCloseTo(1.2);
    expect(result.n).toBe(5);
    expect(result.explanation).toEqual({ subject: "Matematica", factor: 1.2, n: 5 });
  });

  it("discards ratios over four and samples shorter than one minute", () => {
    const samples = [
      makeSample("Biologia", "scientifico", 6_000), // ratio 10
      makeSample("Biologia", "scientifico", 59, 1),
    ];
    const result = calculateSpeedFactor("Biologia", "scientifico", samples, AS_OF);

    expect(result.factor).toBe(1);
    expect(result.n).toBe(0);
  });

  it("clamps a valid ratio of three to two before calculating the factor", () => {
    const sample = makeSample("Fisica", "scientifico", 1_800);
    const result = calculateSpeedFactor("Fisica", "scientifico", [sample], AS_OF);

    expect(ratio(sample)).toBe(3);
    expect(result.factor).toBeCloseTo(7 / 6);
    expect(result.explanation.factor).toBe(1.2);
    expect(result.n).toBe(1);
  });

  it("uses the median of other same-type subjects and excludes future logs after asOf", () => {
    const samples = [
      makeSample("Fisica", "scientifico", 600, 10, 0), // current subject ratio 1
      makeSample("Chimica", "scientifico", 1_200, 10, 1), // other subject ratio 2
      makeSample("Inglese", "lingue", 1_800, 10, 2), // different type
      {
        ...makeSample("Biologia", "scientifico", 840, 10, 3),
        completed_at: "2026-11-03T12:00:00.000Z",
      }, // future relative to asOf
    ];
    const result = calculateSpeedFactor("Fisica", "scientifico", samples, AS_OF);

    expect(result.factor).toBeCloseTo(11 / 6);
    expect(result.n).toBe(1);
  });

  it("uses only the latest ten valid subject samples", () => {
    const olderOutlier = makeSample("Matematica", "scientifico", 1_200, 10, 0);
    const recent = Array.from({ length: 10 }, (_, index) =>
      makeSample("Matematica", "scientifico", 840, 10, index + 1),
    );
    const result = calculateSpeedFactor("Matematica", "scientifico", [olderOutlier, ...recent], AS_OF);

    expect(result.n).toBe(11);
    expect(result.factor).toBeCloseTo(1.275);
  });
});

describe("estimateMinutes", () => {
  it("applies the factor only on Pro and rounds up", () => {
    expect(estimateMinutes(10, 1.2, false)).toBe(10);
    expect(estimateMinutes(11, 1.2, true)).toBe(14);
  });
});
