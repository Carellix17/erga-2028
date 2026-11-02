import { describe, expect, it } from "vitest";
import { baseMinutes } from "@/lib/planner/estimate";
import { subjectType } from "@/lib/planner/subjectType";

describe("subjectType", () => {
  it("classifies a normalized subject name and lets a user override win", () => {
    expect(subjectType(null, "Biologia", {})).toBe("scientifico");
    expect(subjectType(null, "biologia", { Biologia: "umanistico" })).toBe("umanistico");
  });

  it("uses an explicit family before the subject-name dictionary", () => {
    expect(subjectType("scientifiche", "Storia", {})).toBe("scientifico");
    expect(subjectType("latino", "Matematica", {})).toBe("lingue");
  });

  it("recognizes other dictionary subjects and falls back to generale", () => {
    expect(subjectType(null, "Fìsica", {})).toBe("scientifico");
    expect(subjectType(null, "Inglese", {})).toBe("lingue");
    expect(subjectType(null, "Geografia", {})).toBe("umanistico");
    expect(subjectType(null, "Materie varie", {})).toBe("generale");
  });
});

describe("baseMinutes", () => {
  it("matches the acceptance estimates for measured and fallback word counts", () => {
    expect(baseMinutes(489, 4, "scientifico")).toEqual({ minutes: 14, source: "measured_text" });
    expect(baseMinutes(489, 4, "umanistico")).toEqual({ minutes: 8, source: "measured_text" });
    expect(baseMinutes(null, null, "generale")).toEqual({ minutes: 11, source: "default" });
  });

  it("uses the context median when words are absent and defaults null exercises to four", () => {
    expect(baseMinutes(null, null, "scientifico", 800)).toEqual({ minutes: 18, source: "default" });
  });

  it("enforces a three-minute minimum without changing the source", () => {
    expect(baseMinutes(0, 0, "scientifico")).toEqual({ minutes: 3, source: "measured_text" });
  });
});
