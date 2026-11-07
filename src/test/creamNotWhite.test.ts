import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio } from "@/lib/courseIdentity";

const ROOT = join(__dirname, "..", "..");
const css = readFileSync(join(ROOT, "src", "index.css"), "utf-8");
const autoContrast = readFileSync(join(ROOT, "src", "lib", "autoContrast.ts"), "utf-8");

const INK = "#11120D";
const PAPER = "#FFFDF9";
const PRIMARY = "#C82F0A";
const NIGHT_CANVAS = "#0A0A08";

describe("palette e contrasto — design system scuro", () => {
  it("usa bianco come inchiostro e come accento chiaro sul canvas nero", () => {
    expect(css).toContain("--accent-light: 0 0% 100%");
    expect(css).toContain("--ink: 0 0% 100%");
    expect(css).toContain("--cream: var(--accent-light)");
    expect(css).not.toContain("--cedro:");
  });

  it("tiene una sola superficie scura", () => {
    expect(css).toContain("--canvas: 0 0% 3.92%");
    expect(css).toContain("--surface-primary: 0 0% 9.80%");
    expect(css).toContain("--surface-secondary: 220 10.34% 11.37%");
    expect(css).toContain("--ink-muted: 228 7.25% 86.47%");
    expect(css).toContain("--foreground: var(--ink)");
  });

  it("non reintroduce bianco puro o i vecchi neutri nel tema", () => {
    expect(css).not.toContain("#F2F0EF");
    expect(css).not.toContain("#181516");
    expect(css).not.toContain("#252623");
    expect(css).not.toContain("--contrast-ink: 242 240 239");
    expect(css).not.toContain("--contrast-ink: 242 240 239");
  });

  it("l'auto-contrasto sceglie bianco sul canvas e nero sul pieno chiaro", () => {
    expect(autoContrast).toContain("r: 10, g: 10, b: 10");
    expect(autoContrast).toContain("r: 255, g: 255, b: 255");
    expect(autoContrast).toContain('channels: useLight ? "255 255 255" : "10 10 10"');
    expect(css).toContain("--contrast-ink: 255 255 255");
    expect(css).toContain("--contrast-surface: 10 10 10");
  });

  it("verifica le combinazioni primarie della specifica WCAG AA", () => {
    expect(contrastRatio(PAPER, PRIMARY)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(INK, PAPER)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(PAPER, NIGHT_CANVAS)).toBeGreaterThanOrEqual(4.5);
  });
});
