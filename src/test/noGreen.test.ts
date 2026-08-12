import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * 🛡️ P24 × CACCIATORE DI VERDI — test anti-regressione del monocromo.
 * Ogni commit che introduce una tonalità verde (classi Tailwind green/
 * emerald/teal/lime/sage, hue HSL 60-180 con saturazione, hex della vecchia
 * palette bosco, theme-color verdi) FARÀ FALLIRE la suite.
 * È il motivo per cui "il verde non torna più".
 */

const SRC = join(__dirname, "..", "..", "src");
const ROOT = join(__dirname, "..", "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts|css|html)$/.test(name)) out.push(p);
  }
  return out;
}

// Classi Tailwind verdi (parola intera, evita falsi positivi come "message")
const GREEN_CLASS_RE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline)-(?:green|emerald|teal|lime|sage)(?:-\d+|\/\d+)?\b/i;

// Hue HSL 60-180 con saturazione significativa (>5%): spettro del verde
const GREEN_HSL_RE = /hsl\(\s*(?:var\([^)]*\)\s*)?(1[0-7][0-9]|7[0-9]|8[0-9]|9[0-9]|1[0-4][0-9])\s+[1-9][0-9]?%?\s/;

// Hex della vecchia palette bosco / verde salvia
const GREEN_HEX = [
  "0f2014", "19321f", "1d3a26", "12231a", "23402c", "0c1f12", "14301d",
  "17301f", "4f845a", "9dbfa4", "f3f7f4", "e5ede7", "d5e2d8", "2e7d46",
  "3c6946", "315439", "72a17b", "a9c4b1", "5a655d", "2f3f34", "b3f05c",
];
const HEX_RE = new RegExp(`#(${GREEN_HEX.join("|")})`, "i");

describe("Cacciatore di verdi (monocromo)", () => {
  const files = walk(SRC);
  const problems: string[] = [];

  for (const file of files) {
    if (file.endsWith("noGreen.test.ts")) continue; // il test stesso contiene la lista hex
    const content = readFileSync(file, "utf-8");

    if (GREEN_CLASS_RE.test(content)) {
      problems.push(`${file}: classe Tailwind verde`);
    }
    if (HEX_RE.test(content)) {
      problems.push(`${file}: hex della vecchia palette bosco`);
    }
    // nei CSS controlla anche gli hue verdi nei token (escluso subject-accent HEX)
    if (file.endsWith(".css") && GREEN_HSL_RE.test(content)) {
      problems.push(`${file}: hue HSL verde in una regola/token`);
    }
  }

  // theme-color / manifest
  for (const f of ["index.html", "vite.config.ts"]) {
    const c = readFileSync(join(ROOT, f), "utf-8");
    if (/#0f2014|#19321f|#4f845a/i.test(c)) problems.push(`${f}: theme-color/colore bosco`);
  }

  it("nessun verde in tutta la codebase", () => {
    expect(problems).toEqual([]);
  });
});
