import { describe, it, expect } from "vitest";
import { cleanSubjectTitleForSearch } from "@/lib/courseTitle";

describe("cleanSubjectTitleForSearch", () => {
  it("rimuove estensione e separatori", () => {
    expect(cleanSubjectTitleForSearch("Appunti_Di_Storia_Romana_v2.pdf")).toBe(
      "Storia Romana",
    );
    expect(cleanSubjectTitleForSearch("Fisica Quantistica.docx")).toBe(
      "Fisica Quantistica",
    );
  });

  it("rimuove le keyword di sistema", () => {
    expect(cleanSubjectTitleForSearch("appunti matematica funzioni")).toBe(
      "matematica funzioni",
    );
    expect(cleanSubjectTitleForSearch("bozza capitolo 3 - economia")).toBe(
      "economia",
    );
  });

  it("gestisce stringhe vuote / solo rumore", () => {
    expect(cleanSubjectTitleForSearch("")).toBe("");
    expect(cleanSubjectTitleForSearch("appunti.pdf")).toBe("");
  });
});
