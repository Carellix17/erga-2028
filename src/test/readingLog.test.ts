import { describe, expect, it } from "vitest";
import { buildReadingLog } from "@/lib/planner/readingLog";
import type { BuildReadingLogInput } from "@/lib/planner/readingLog";

const baseInput: BuildReadingLogInput = {
  activeSeconds: 20_000,
  baseEstimateMin: 8.5,
  contextId: "context-1",
  exerciseCount: 3,
  lessonOrder: 2,
  subject: "Fisica",
  subjectType: "scientifiche",
  userId: "user-1",
  wordCount: 400,
};

describe("buildReadingLog", () => {
  it("clamps active time and stores metrics without any lesson text", () => {
    const payload = buildReadingLog(baseInput);

    expect(payload).toEqual({
      active_seconds: 14_400,
      base_estimate_min: 8.5,
      context_id: "context-1",
      exercise_count: 3,
      lesson_order: 2,
      subject: "Fisica",
      subject_type: "scientifiche",
      user_id: "user-1",
      word_count: 400,
    });
    expect(payload).not.toHaveProperty("concept");
    expect(payload).not.toHaveProperty("explanation");
    expect(payload).not.toHaveProperty("example");
    expect(payload).not.toHaveProperty("exercises");
  });

  it("clamps negative active time to zero and normalizes unknown context fields", () => {
    const payload = buildReadingLog({
      ...baseInput,
      activeSeconds: -12,
      contextId: undefined,
      subject: undefined,
      subjectType: undefined,
    });

    expect(payload.active_seconds).toBe(0);
    expect(payload.context_id).toBeNull();
    expect(payload.subject).toBeNull();
    expect(payload.subject_type).toBeNull();
  });
});
