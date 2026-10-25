import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * 🛡️ GUARDIA DELLE SUPERFICI — Home, design system v4.
 *
 * La Home usa carta e copertine locali, senza vetro o ombre morbide.
 */

const HOME_DIR = join(__dirname, "..", "components", "home");

const FORBIDDEN = [/shadow-xl\b/i, /shadow-2xl\b/i, /blur-xl\b/i, /blur-2xl\b/i, /bg-gradient-to-/i];

describe("Superfici pulite della Home", () => {
  const files = readdirSync(HOME_DIR).filter((name) => name.endsWith(".tsx"));

  it("nessuna ombra pesante, bagliore o gradiente parassita nei componenti Home", () => {
    const problems: string[] = [];
    for (const name of files) {
      const content = readFileSync(join(HOME_DIR, name), "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(content)) problems.push(`${name}: contiene ${pattern}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("il tavolo della Home è piatto: nessun alone ambientale da reintrodurre", () => {
    const view = readFileSync(join(HOME_DIR, "HomeView.tsx"), "utf8");
    const skeleton = readFileSync(join(HOME_DIR, "HomeDashboardSkeleton.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    // il sistema aura è stato rimosso: i marcatori opt-out non servono più
    expect(view).not.toContain("no-ambient");
    expect(skeleton).not.toContain("no-ambient");
    expect(css).not.toContain("P27 — AURA ANIMATA");
  });

  it("separa la pratica dagli accessi a materiali e chat senza griglia di card", () => {
    const view = readFileSync(join(HOME_DIR, "HomeView.tsx"), "utf8");
    expect(view).toContain("practiceActions");
    expect(view).toContain('home.tools.practiceGroupAria');
    expect(view).toContain('home.tools.materialChatGroupAria');
    expect(view).toContain('home.tools.upload');
    expect(view).toContain('home.tools.chat');
    expect(view).not.toContain("QuickToolsGrid");
    expect(view).not.toContain("Azioni consigliate");
    expect(view).not.toContain("cognitive-grid");
  });

  it("il satinato è locale alle copertine, tokenizzato e con fallback opaco", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    expect(css).toContain(".btn-satin {");
    expect(css).toMatch(/background-color: rgb\(var\(--satin-bg\) \/ 0\.9\)/);
    expect(css).toMatch(/backdrop-filter: blur\(8px\)/);
    expect(css).toMatch(/\.dark \.btn-satin \{[\s\S]*?0\.9/);
    expect(css).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\)/);
    expect(css).toMatch(/prefers-reduced-transparency: reduce[\s\S]*?\.btn-satin/);
    expect(css).toMatch(/\.btn-satin:focus-visible[\s\S]*?box-shadow/);
  });

  it("le superfici della Home restano SOLIDE: blur solo al satinato della copertina", () => {
    const files = readdirSync(HOME_DIR).filter((name) => name.endsWith(".tsx"));
    for (const name of files) {
      const content = readFileSync(join(HOME_DIR, name), "utf8");
      expect(content, name).not.toMatch(/backdrop-filter|backdrop-blur|glass-tactile|btn-satin/);
    }
  });

  it("la card corso riusa la copertina di Studio senza ombre o grana generalizzata", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    expect(hero).toContain("CourseCardBackground");
    expect(hero).toContain("courseCoverVars");
    expect(hero).toContain("text-contrast");
    expect(hero).not.toMatch(/shadow-(?:xl|2xl|level-[1-5]|tactile)/);
    expect(hero).not.toContain("paper-grain");
    // La composizione condivisa resta geometrica, senza blur.
    expect(bg).toContain("cover-grain");
    expect(bg).not.toContain("blur-");
    expect(bg).not.toContain("orb-main");
    expect(bg).not.toContain("orb-secondary");
  });

  it("la CTA 'Riprendi/Continua' resta un Button pieno e facilmente toccabile", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("<Button onClick={onPrimaryCta}");
    expect(hero).toContain("min-h-12 w-full");
    expect(hero).not.toContain("btn-satin");
    // la vecchia CTA semiopaca color-mix non deve tornare
    expect(hero).not.toContain("color-mix(in srgb, currentColor 12%");
  });

  it("il titolo del corso usa la gerarchia UI e spezza le parole senza uscire", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("text-3xl font-semibold");
    expect(hero).toContain("break-words");
    expect(hero).toContain("max-w-[22ch]");
    // la voce focale Radja non guida il prodotto (resta al Login)
    expect(hero).not.toContain("font-radja");
  });

  it("usa i token earthy e le ombre flat documentate", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    expect(css).toContain("--canvas: 45.0000 26.6667% 94.1176%");
    expect(css).toContain("--surface-primary: 42.8571 41.1765% 96.6667%");
    expect(css).toContain("--surface-secondary: 42.8571 25.0000% 89.0196%");
    expect(css).toContain("--shadow-level-3: none");
    // la copertina non usa gradienti: campo pieno + forme nette
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    expect(bg).not.toContain("linear-gradient");
  });

  it("l'avanzamento della card corso è lineare e accessibile", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain('role="progressbar"');
    expect(hero).toContain("aria-valuenow={percent}");
    expect(hero).toContain("aria-valuemin={0}");
    expect(hero).toContain("aria-valuemax={100}");
  });
});
