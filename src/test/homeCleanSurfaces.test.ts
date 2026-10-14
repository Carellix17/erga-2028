import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * 🛡️ GUARDIA DELLE SUPERFICI — Home, design system v3.
 *
 * La Home usa superfici solide e ombre flat tokenizzate. La grana resta
 * decorativa e non altera l'opacità del contenuto; il solo blur è il velo
 * satinato dell'azione sulla copertina del corso.
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

  it("gli strumenti rapidi sono card arrotondate con chip quieto, etichette mai troncate", () => {
    const grid = readFileSync(join(HOME_DIR, "QuickToolsGrid.tsx"), "utf8");
    // card di strumenti: raggio card 12px secondo DESIGN.md v3.
    expect(grid).toContain("rounded-card");
    // le etichette non vengono MAI troncate: vanno a capo con interlinea compatta
    expect(grid).not.toContain("truncate");
    expect(grid).not.toContain("line-clamp");
    expect(grid).toContain("leading-tight");
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
      if (name === "CourseHeroCard.tsx") {
        // unica eccezione dichiarata: il velo satinato dell'azione (2.1 §4)
        expect(content).toContain("btn-satin");
        expect(content).not.toMatch(/backdrop-filter|backdrop-blur|glass-tactile/);
        continue;
      }
      expect(content, name).not.toMatch(/backdrop-filter|backdrop-blur|glass-tactile|btn-satin/);
    }
  });

  it("la card corso usa la copertina astratta e il raggio 12px della specifica", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    // foglio protagonista: raggio hero e ombra del sistema
    expect(hero).toContain("rounded-hero");
    expect(hero).toContain("shadow-level-3");
    // composizione astratta condivisa col sistema copertina (courseIdentity)
    expect(hero).toContain("CourseCardBackground");
    expect(hero).toContain("courseCoverVars");
    // grana condivisa, niente orb sfocati
    expect(bg).toContain("cover-grain");
    expect(bg).not.toContain("blur-");
    expect(bg).not.toContain("orb-main");
    expect(bg).not.toContain("orb-secondary");
  });

  it("la CTA 'Riprendi/Continua' usa il satinato solo sulla copertina", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("btn-satin");
    expect(hero).toContain("w-full");
    // la vecchia CTA semiopaca color-mix non deve tornare
    expect(hero).not.toContain("color-mix(in srgb, currentColor 12%");
  });

  it("il titolo del corso è display serif e spezza le parole senza uscire", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("font-display");
    expect(hero).toContain("font-medium");
    expect(hero).toContain("break-words");
    expect(hero).toContain("min-w-0");
    // la voce focale Radja non guida il prodotto (resta al Login)
    expect(hero).not.toContain("font-radja");
  });

  it("usa i token earthy e le ombre flat documentate", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    expect(css).toContain("--canvas: 72 16.13% 6.08%");
    expect(css).toContain("--surface-primary: 50.77 8.18% 31.18%");
    expect(css).toContain("--surface-secondary: 40.71 26.42% 79.22%");
    expect(css).toContain(
      "--shadow-level-3: 0 2px 4px rgba(17, 18, 13, 0.04), 0 10px 24px rgba(17, 18, 13, 0.08)",
    );
    // la copertina non usa gradienti: campo pieno + forme nette
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    expect(bg).not.toContain("linear-gradient");
  });

  it("la ciambella della card corso è responsiva per gli schermi piccoli", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("h-14 w-14");
    expect(hero).toContain("sm:h-16 sm:w-16");
  });
});
