import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio } from "@/lib/courseIdentity";

const ROOT = join(__dirname, "..", "..");
const css = readFileSync(join(ROOT, "src", "index.css"), "utf-8");
const autoContrast = readFileSync(join(ROOT, "src", "lib", "autoContrast.ts"), "utf-8");

const INK = "#11120D";
const PAPER = "#FFFDF9";
const INK_MUTED = "#4A4942";
const PRIMARY = "#C82F0A";
const NIGHT_CANVAS = "#0A0A08";
const NIGHT_INK = "#FFFBF4";

describe("palette e contrasto — design system v4", () => {
  it("usa la carta #FFFDF9 come accento chiaro e l'inchiostro #11120D", () => {
    // Giorno: accento chiaro = foglio di lettura, inchiostro = testo principale.
    expect(css).toContain("--accent-light: 40.0000 100.0000% 98.8235%");
    expect(css).toContain("--paper: 40.0000 100.0000% 98.8235%");
    expect(css).toContain("--ink: 72.0000 16.1290% 6.0784%");
    expect(css).toContain("--cream: var(--accent-light)");
    expect(css).not.toContain("--cedro:");
    // Alias esadecimali condivisi della griglia svizzera.
    expect(css).toContain("--bg-sheet: #FFFDF9");
    expect(css).toContain("--text-primary: #11120D");
  });

  it("mantiene i token notte su canvas scuro, superficie calda e testo Floral White", () => {
    expect(css).toContain("--canvas: 60 11.11% 3.53%");
    expect(css).toContain("--surface-primary: 60 10.64% 9.22%");
    expect(css).toContain("--surface-secondary: 60 3.85% 14.31%");
    expect(css).toContain("--ink: 38.18 100% 97.84%");
    expect(css).toContain("--ink-muted: 40.71 26.42% 79.22%");
    expect(css).toContain("--foreground: var(--ink)");
  });

  it("non reintroduce bianco puro o i vecchi neutri nel tema", () => {
    expect(css).not.toContain("#F2F0EF");
    expect(css).not.toContain("#181516");
    expect(css).not.toContain("#252623");
    expect(css).not.toContain("--contrast-ink: 242 240 239");
    expect(css).not.toContain("--contrast-ink, 255 255 255");
  });

  it("l'auto-contrasto sceglie solo gli inchiostri ufficiali della palette", () => {
    expect(autoContrast).toContain("r: 17, g: 18, b: 13");
    expect(autoContrast).toContain("r: 255, g: 251, b: 244");
    expect(autoContrast).toContain('channels: useLight ? "255 251 244" : "17 18 13"');
    expect(css).toContain("--contrast-ink: 255 251 244");
    expect(css).toContain("--contrast-surface: 17 18 13");
  });

  it("verifica le combinazioni primarie della specifica WCAG AA", () => {
    // Testo secondario e testo principale sulla carta di lettura.
    expect(contrastRatio(PAPER, INK_MUTED)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(PAPER, INK)).toBeGreaterThanOrEqual(4.5);
    // CTA vermiglia #C82F0A con testo carta: circa 5,35:1 (DESIGN.md v4).
    expect(contrastRatio(PAPER, PRIMARY)).toBeGreaterThanOrEqual(4.5);
    // Notte: testo #FFFBF4 sul canvas #0A0A08.
    expect(contrastRatio(NIGHT_INK, NIGHT_CANVAS)).toBeGreaterThanOrEqual(4.5);
  });
});
