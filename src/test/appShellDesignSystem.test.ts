import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("design system scuro — app shell", () => {
  it("usa pillole sui controlli, 8px su card e campi, 0 sulle bande", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/index.css");

    expect(tailwind).toContain('xs: "var(--radius-xs)"');
    expect(tailwind).toContain('control: "var(--radius-control)"');
    expect(tailwind).toContain('card: "var(--radius-card)"');
    expect(tailwind).toContain('button: "var(--radius-button)"');
    expect(tailwind).toContain('nav: "var(--radius-nav)"');
    expect(css).toContain("--radius-xs: 8px");
    expect(css).toContain("--radius-control: 8px");
    expect(css).toContain("--radius-card: 8px");
    expect(css).toContain("--radius-hero: 0px");
    expect(css).toContain("--radius-button: 9999px");
    expect(css).toContain("--radius-pill: 9999px");
    expect(css).toContain("--radius-nav: 0px");
    expect(css).toContain("--radius-dialog: 8px");
    expect(css).toContain("--radius-full: 9999px");
    expect(css).not.toContain("--radius-hero: 32px");
    expect(css).not.toContain("--radius-button: 16px");
  });

  it("usa AppLayout e la Earthy Stripe condivisa, senza le vecchie texture globali", () => {
    const index = read("src/pages/Index.tsx");
    const layout = read("src/components/layout/AppLayout.tsx");
    const css = read("src/index.css");

    expect(index).toContain("<AppLayout");
    expect(index).not.toContain("dot-halo-scope");
    expect(index).not.toContain("<BottomNav");
    expect(layout).toContain('className="erga-earthy-stripe"');
    expect(css).toContain(".erga-earthy-stripe {");
    expect(css).toContain("height: 4px");
    expect(layout).not.toContain("bg-dot-grid");
    expect(css).not.toContain("P26 — MARGINE AMBIENTE");
    expect(css).not.toContain("@keyframes ambient-margin-drift");
  });

  it("lega card, bottoni e input ai token semantici", () => {
    const card = read("src/components/ui/card.tsx");
    const button = read("src/components/ui/button.tsx");
    const input = read("src/components/ui/input.tsx");

    expect(card).toContain("rounded-card");
    expect(card).toContain("bg-card");
    expect(card).toContain("border-border");
    expect(button).toContain("rounded-button");
    expect(button).toContain("bg-primary text-primary-foreground");
    expect(input).toContain("rounded-control");
    expect(input).toContain("bg-sheet");
    expect(input).toContain("border-foreground/40");
  });

  it("tiene l'outline come azione comune e un solo pieno bianco, senza ombre", () => {
    const button = read("src/components/ui/button.tsx");
    const css = read("src/index.css");
    const tailwind = read("tailwind.config.ts");

    expect(button).toMatch(/default:\s*"[^"\n]*border-foreground\/40/);
    expect(button).toMatch(/filled:\s*"[^"\n]*bg-primary text-primary-foreground/);
    expect(tailwind).toContain('"primary-action": "var(--shadow-primary-action)"');
    expect(css).toContain("--shadow-primary-action: none");
    expect(button).not.toContain("shadow-primary-action");
    expect(button).not.toContain("active:translate-x");
    expect(button).not.toContain("active:translate-y");
    expect(css).toContain("--primary: 0 0% 100%");
    expect(css).toContain("--primary-foreground: var(--canvas)");
  });

  it("nav mobile: barra attaccata da 64px con safe area e quattro destinazioni", () => {
    const nav = read("src/components/layout/BottomNav.tsx");

    expect(nav).not.toContain("from-black");
    expect(nav).not.toContain("bg-gradient-to-t");
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(nav).toContain("fixed inset-x-0 bottom-0");
    expect(nav).toContain("border-t border-border bg-sheet");
    expect(nav).not.toContain("pointer-events-none md:hidden");
    expect(nav).toContain("h-16");
    expect(nav).toContain("grid-cols-4");
    expect(nav).toContain("app-nav-indicator");
    expect(nav).not.toContain("ResizeObserver");
    expect(read("src/index.css")).toContain(".app-nav-indicator { transition: transform");
    expect(nav).toContain('{ id: "core" as Tab, i18nKey: "nav.core"');
    expect(nav).toContain("aria-current");
    expect(nav).not.toContain("layoutId=");
  });

  it("mantiene la rail tablet e la sidebar desktop senza cambiare la navigazione", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("w-[84px]");
    expect(nav).toContain("md:flex");
    expect(nav).toContain("lg:w-56");
    expect(nav).not.toContain("xl:w-64");
  });

  it("definisce l'unica superficie scura dai token di DESIGN.md", () => {
    const css = read("src/index.css");
    expect(css).toContain("--canvas: 0 0% 3.92%");
    expect(css).toContain("--surface-primary: 0 0% 9.80%");
    expect(css).toContain("--surface-secondary: 220 10.34% 11.37%");
    expect(css).toContain("--ink: 0 0% 100%");
    expect(css).toContain("--sand: 40.71 26.42% 79.22%");
    expect(css).toContain("--olive: 50.77 8.18% 31.18%");
    expect(css).not.toContain("--canvas: 45.0000 26.6667% 94.1176%");
  });

  it("usa Geist per la UI e Geist Mono per le etichette", () => {
    const tailwind = read("tailwind.config.ts");
    const html = read("index.html");
    const main = read("src/main.tsx");
    expect(tailwind).toContain('display: ["Geist", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('sans: ["Geist", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('reading: ["Geist", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('editorial: ["Geist", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('mono: ["Geist Mono", "ui-monospace", "monospace"]');
    expect(main).toContain("@fontsource/geist/400.css");
    expect(main).toContain("@fontsource/geist-mono/400.css");
    expect(html).not.toContain("family=Instrument+Serif");
    expect(html).not.toContain("family=Ubuntu+Sans");
    expect(html).not.toContain("Playfair+Display");
    expect(html).not.toContain("Montserrat");
  });

  it("mantiene il contrasto AA del giorno di oggi e documenta i rapporti dei temi", () => {
    const css = read("src/index.css");
    const todayRule = css.match(/\.planner-day-today \.planner-day-number\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(todayRule).toContain("color: hsl(var(--foreground))");
    expect(todayRule).not.toContain("var(--primary)");
    expect(todayRule).toContain("font-weight: 400");
    expect(todayRule).toContain("text-decoration-thickness: 2px");
    expect(todayRule).toContain("text-decoration-color: currentColor");
    expect(css).toContain(".dark .planner-day-outside:not(.planner-day-today)");
    expect(css).toContain("color: hsl(var(--steel))");
    expect(css).toContain("repeating-linear-gradient");
    expect(css).toMatch(/\|\s*Oggi \(--foreground su --secondary\)\s*\|\s*15\.10:1\s*\|\s*14\.71:1\s*\|\s*15\.10:1/);
    expect(css).toMatch(/\|\s*Fuori mese \(day --muted-foreground; dark --steel su --background\)\s*\|\s*7\.12:1\s*\|\s*10\.55:1\s*\|\s*8\.08:1/);
  });

  it("nomina il Piano con l'intestazione del calendario", () => {
    const calendar = read("src/components/piano/AppointmentsCalendar.tsx");
    const pianoView = read("src/components/piano/PianoView.tsx");

    expect(pianoView).toContain('<section className="min-w-0" aria-labelledby="planner-calendar-heading">');
    expect((calendar.match(/id="planner-calendar-heading"/g) ?? [])).toHaveLength(2);
  });
});
