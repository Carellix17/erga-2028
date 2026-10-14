import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio } from "@/lib/courseIdentity";

const ROOT = join(__dirname, "..", "..");
const css = readFileSync(join(ROOT, "src", "index.css"), "utf-8");
const autoContrast = readFileSync(join(ROOT, "src", "lib", "autoContrast.ts"), "utf-8");

const INK = "#11120D";
const PAPER = "#FFFBF4";
const OLIVE = "#565449";
const NIGHT_CANVAS = "#0A0A08";

describe("palette e contrasto — design system v3", () => {
  it("usa Floral White come accento chiaro e Smoky Black come inchiostro", () => {
    expect(css).toContain("--accent-light: 38.18 100% 97.84%");
    expect(css).toContain("--ink: 72 16.13% 6.08%");
    expect(css).toContain("--cream: var(--accent-light)");
    expect(css).not.toContain("--cedro:");
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
    expect(contrastRatio(PAPER, OLIVE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(INK, PAPER)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(PAPER, NIGHT_CANVAS)).toBeGreaterThanOrEqual(4.5);
  });
});
