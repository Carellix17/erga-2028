import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("app shell design system", () => {
  it("espone radius semantici e marcatamente morbidi per card, bottoni e pillole", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/index.css");
    expect(tailwind).toContain('card: "var(--radius-card)"');
    expect(tailwind).toContain('button: "var(--radius-button)"');
    expect(tailwind).toContain('pill: "var(--radius-pill)"');
    expect(css).toContain("--radius-card: 1.5rem");
    expect(css).toContain("--radius-button: 1rem");
    expect(css).toContain("--radius-media: 1.5rem");
  });

  it("usa AppLayout e non applica più l'alone nero globale", () => {
    const index = read("src/pages/Index.tsx");
    expect(index).toContain("<AppLayout");
    expect(index).not.toContain("dot-halo-scope");
    expect(index).not.toContain("<BottomNav");
  });

  it("mantiene i componenti base legati ai token del tema", () => {
    const card = read("src/components/ui/card.tsx");
    const button = read("src/components/ui/button.tsx");
    const input = read("src/components/ui/input.tsx");
    expect(card).toContain("rounded-card");
    expect(card).toContain("bg-card");
    expect(card).not.toContain("from-white");
    expect(button).toContain("rounded-button");
    expect(button).toContain("bg-primary text-primary-foreground");
    expect(input).toContain("rounded-button");
    expect(input).toContain("bg-card");
  });

  it("non usa più il gradiente nero hardcoded nella navigazione mobile", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("from-background");
    expect(nav).not.toContain("from-black");
  });

  it("in dark mode spegne i puntini e usa il fondo #05090A", () => {
    const css = read("src/index.css");
    expect(css).toContain("--background: 192 33% 3%");
    expect(css).toContain("#05090A");
    const darkDot = css.match(/\.dark \.bg-dot-grid \{[\s\S]*?\}/);
    expect(darkDot?.[0]).toContain("background-image: none");
    expect(darkDot?.[0]).not.toContain("radial-gradient");
  });

  it("applica il margine ambiente solo ai blocchi, non ai campi di testo", () => {
    const css = read("src/index.css");
    expect(css).toContain("P26 — MARGINE AMBIENTE DEI BLOCCHI");
    expect(css).toContain("ambient-margin-pulse");
    expect(css).toContain("ambient-margin-breathe");
    expect(css).toContain("--ambient-block-ink");
    expect(css).toContain(":not(input, textarea, select");
    expect(css).toContain(".m3-text-field-filled");
    expect(css).toContain(".no-ambient");
    expect(css).not.toMatch(/\.dark [^{]*\b(h1|h2|p|span)\b[^{]*ambient-margin/);
  });

  it("anima l'aura dei blocchi in entrambi i temi mescolando tinta e fondo", () => {
    const css = read("src/index.css");
    expect(css).toContain("P27 — AURA ANIMATA DEI BLOCCHI");
    // sfumatura conica che gira lentamente attorno al bordo
    expect(css).toContain("@keyframes ambient-margin-drift");
    expect(css).toContain("conic-gradient(");
    expect(css).toContain("from var(--aura-angle)");
    expect(css).toMatch(/ambient-margin-drift \d+s linear infinite/);
    // il fondo con cui si mescola la tinta: bianco di giorno, nero di notte
    expect(css).toMatch(/:root \{[\s\S]*?--aura-void: hsl\(0 0% 100%\);/);
    expect(css).toMatch(/\.dark \{[\s\S]*?--aura-void: hsl\(0 0% 0%\);/);
    // la tinta arriva dal blocco stesso (o dal colore materia inline)
    expect(css).toContain("--aura-ink: var(--ambient-block-ink, var(--ambient-ink));");
  });

  it("mantiene l'aura discreta: niente campi di testo, meno moto su telefono e con reduced motion", () => {
    const css = read("src/index.css");
    const aura = css.slice(css.indexOf("P27 — AURA ANIMATA DEI BLOCCHI"));
    // il pseudo-elemento resta escluso da input, campi e sottoalberi opt-out
    expect(aura).toMatch(/::after[\s\S]*?content: ""/);
    expect(aura).toContain(":not(input, textarea, select");
    expect(aura).toContain(".no-ambient");
    // telefono: nessuna rotazione, solo respiro
    expect(aura).toMatch(/@media \(max-width: 640px\)[\s\S]*?animation: ambient-margin-breathe/);
    // preferenze di movimento ridotto
    expect(aura).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/);
    expect(aura).toMatch(/html\.reduce-motion[\s\S]*?animation: none/);
    expect(aura).toMatch(/@media \(prefers-contrast: more\)[\s\S]*?content: none/);
  });

  it("espone la pagina /aura-lab solo in sviluppo, con toggle tema e tinte d'esempio", () => {
    const app = read("src/App.tsx");
    // registrata SOLO dietro import.meta.env.DEV
    expect(app).toContain('import("./pages/AuraLab")');
    expect(app).toContain('import.meta.env.DEV && <Route path="/aura-lab"');
    const page = read("src/pages/AuraLab.tsx");
    expect(page).toContain("useTheme");
    expect(page).toContain("--ambient-block-ink");
    expect(page).toContain("no-halo");
  });
});
