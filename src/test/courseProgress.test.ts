import { describe, expect, it } from "vitest";
import { getCourseProgress } from "@/lib/courseProgress";

describe("getCourseProgress", () => {
  it("uses a one-based lesson position and completion based on prior lessons", () => {
    expect(getCourseProgress(0, 22)).toEqual({
      lessonNumber: 1,
      totalLessons: 22,
      completedCount: 0,
      completionPercent: 0,
    });
    expect(getCourseProgress(1, 22)).toEqual({
      lessonNumber: 2,
      totalLessons: 22,
      completedCount: 1,
      completionPercent: 5,
    });
  });

  it("clamps invalid and out-of-range indices without changing stored progress", () => {
    expect(getCourseProgress(-4, 3)).toMatchObject({
      lessonNumber: 1,
      completedCount: 0,
      completionPercent: 0,
    });
    expect(getCourseProgress(8, 3)).toMatchObject({
      lessonNumber: 3,
      completedCount: 2,
      completionPercent: 67,
    });
    expect(getCourseProgress(Number.NaN, 0)).toMatchObject({
      lessonNumber: 0,
      totalLessons: 0,
      completedCount: 0,
      completionPercent: 0,
    });
  });
});
