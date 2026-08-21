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
});
