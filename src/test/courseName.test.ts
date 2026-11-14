import { describe, expect, it } from "vitest";
import { courseNameMatches } from "@/lib/courseName";

describe("courseNameMatches", () => {
  it("confronta il nome pulito senza maiuscole né accenti", () => {
    expect(courseNameMatches("Città.pdf", "citta")).toBe(true);
    expect(courseNameMatches("Analisi matematica.pdf", "MATEMATICA")).toBe(true);
    expect(courseNameMatches("Stòria.pdf", "storia")).toBe(true);
  });

  it("non accetta un nome che non contiene il testo", () => {
    expect(courseNameMatches("Fisica.pdf", "mate")).toBe(false);
  });

  it("con il campo vuoto lascia passare ogni corso", () => {
    expect(courseNameMatches("Fisica.pdf", "   ")).toBe(true);
  });
});