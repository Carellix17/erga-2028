import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("design system v3 — app shell", () => {
  it("espone la geometria 4/8/12px prevista da DESIGN.md", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/index.css");

    expect(tailwind).toContain('xs: "var(--radius-xs)"');
    expect(tailwind).toContain('control: "var(--radius-control)"');
    expect(tailwind).toContain('card: "var(--radius-card)"');
    expect(tailwind).toContain('button: "var(--radius-button)"');
    expect(tailwind).toContain('nav: "var(--radius-nav)"');
    expect(css).toContain("--radius-xs: 4px");
    expect(css).toContain("--radius-control: 8px");
    expect(css).toContain("--radius-card: 12px");
    expect(css).toContain("--radius-hero: 12px");
    expect(css).toContain("--radius-button: 8px");
    expect(css).toContain("--radius-pill: 8px");
    expect(css).toContain("--radius-nav: 12px");
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
    expect(input).toContain("bg-secondary");
    expect(input).toContain("border-input");
  });

  it("mantiene CTA primaria piatta, Olive Drab e con raggio 8px", () => {
    const button = read("src/components/ui/button.tsx");
    const css = read("src/index.css");

    expect(button).toMatch(/default:\s*"bg-primary text-primary-foreground/);
    expect(button).not.toMatch(/default:\s*"[^"]*rounded-pill/);
    expect(css).toContain("--primary: var(--surface-primary)");
    expect(css).toContain("--primary-deep: 50 11.54% 20.39%");
    expect(css).toContain("--primary-foreground: var(--accent-light)");
  });

  it("nav mobile: dock Olive Drab da 64px con safe area e quattro destinazioni", () => {
    const nav = read("src/components/layout/BottomNav.tsx");

    expect(nav).not.toContain("from-black");
    expect(nav).not.toContain("bg-gradient-to-t");
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(nav).toContain("rounded-nav");
    expect(nav).toContain("h-16");
    expect(nav).toContain("grid-cols-4");
    expect(nav).toContain("stiffness: 400, damping: 30");
    expect(nav).toContain('{ id: "core" as Tab, i18nKey: "nav.core"');
    expect(nav).toContain("aria-current");
    expect(nav).not.toContain("layoutId=");
  });

  it("mantiene la rail tablet e la sidebar desktop senza cambiare la navigazione", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("md:flex md:h-full md:w-[84px]");
    expect(nav).toContain("lg:w-64");
    expect(nav).not.toContain("xl:w-64");
  });

  it("definisce le superfici giorno e notte dai token ufficiali", () => {
    const css = read("src/index.css");
    expect(css).toContain("--canvas: 72 16.13% 6.08%");
    expect(css).toContain("--surface-primary: 50.77 8.18% 31.18%");
    expect(css).toContain("--surface-secondary: 40.71 26.42% 79.22%");
    expect(css).toContain("--ink: 72 16.13% 6.08%");
    expect(css).toContain("--accent-light: 38.18 100% 97.84%");
    expect(css).toContain("--canvas: 60 11.11% 3.53%");
    expect(css).toContain("--surface-primary: 60 10.64% 9.22%");
    expect(css).toContain("--surface-secondary: 60 3.85% 14.31%");
    expect(css).toContain("--line: 50 11.54% 20.39%");
  });

  it("usa Playfair Display per i titoli e Inter per UI e lettura", () => {
    const tailwind = read("tailwind.config.ts");
    const html = read("index.html");
    expect(tailwind).toContain('display: ["Playfair Display", "Lora", "Georgia", "serif"]');
    expect(tailwind).toContain('sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]');
    expect(tailwind).toContain('reading: ["Inter", "system-ui", "-apple-system", "sans-serif"]');
    expect(html).toContain("family=Playfair+Display");
    expect(html).toContain("family=Inter");
    expect(html).not.toContain("Ubuntu+Sans");
    expect(html).not.toContain("Montserrat");
  });
});
