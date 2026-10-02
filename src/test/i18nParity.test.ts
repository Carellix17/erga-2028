import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 🅐 FONDAMENTA — le traduzioni italiano/inglese devono restare allineate:
 * ogni chiave presente in una lingua deve esistere anche nell'altra.
 * Evita che una schermata funzioni in italiano e mostri la chiave «grezza»
 * (o un buco) in inglese.
 */

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
}

const itDict = JSON.parse(
  readFileSync(join(__dirname, "..", "i18n", "locales", "it.json"), "utf8"),
) as Record<string, unknown>;
const enDict = JSON.parse(
  readFileSync(join(__dirname, "..", "i18n", "locales", "en.json"), "utf8"),
) as Record<string, unknown>;

const itKeys = new Set(flatten(itDict));
const enKeys = new Set(flatten(enDict));

describe("Traduzioni allineate (it ↔ en)", () => {
  it("stesso numero di chiavi nelle due lingue", () => {
    expect(itKeys.size).toBe(enKeys.size);
  });

  it("nessuna chiave presente solo in italiano", () => {
    const mancanti = [...itKeys].filter((k) => !enKeys.has(k));
    expect(mancanti).toEqual([]);
  });

  it("nessuna chiave presente solo in inglese", () => {
    const mancanti = [...enKeys].filter((k) => !itKeys.has(k));
    expect(mancanti).toEqual([]);
  });
});
