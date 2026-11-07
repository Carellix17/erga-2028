import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Dictionary = Record<string, unknown>;

function flattenKeys(value: unknown, prefix = "piano"): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];

  return Object.entries(value as Dictionary).flatMap(([key, child]) =>
    flattenKeys(child, `${prefix}.${key}`),
  );
}

function loadPianoKeys(language: "it" | "en"): Set<string> {
  const dictionary = JSON.parse(
    readFileSync(join(__dirname, "..", "i18n", "locales", `${language}.json`), "utf8"),
  ) as Dictionary;
  const piano = dictionary.piano;
  if (!piano || typeof piano !== "object" || Array.isArray(piano)) {
    throw new Error(`Missing piano translations for ${language}`);
  }

  return new Set(flattenKeys(piano));
}

const italianKeys = loadPianoKeys("it");
const englishKeys = loadPianoKeys("en");

describe("chiavi i18n del Piano", () => {
  it("mantiene allineate le chiavi piano.* tra italiano e inglese", () => {
    expect([...italianKeys].filter((key) => !englishKeys.has(key)).sort()).toEqual([]);
    expect([...englishKeys].filter((key) => !italianKeys.has(key)).sort()).toEqual([]);
  });
});
