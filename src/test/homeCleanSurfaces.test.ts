import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * 🛡️ GUARDIA DELLE SUPERFICI PULITE — la Home non deve mai reintrodurre
 * ombre nere pesanti, bagliori o gradienti parassiti tra le card:
 * niente shadow-xl/shadow-2xl, niente blur-xl/blur-2xl, niente
 * bg-gradient-to-* nei componenti della Home. L'elevazione arriva solo
 * dai token leggeri del design system (shadow-level-1/2) e l'alone
 * ambientale globale è escluso tramite `no-ambient` sulla radice.
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

  it("la radice di HomeView e dello skeleton esclude l'alone ambientale", () => {
    const view = readFileSync(join(HOME_DIR, "HomeView.tsx"), "utf8");
    const skeleton = readFileSync(join(HOME_DIR, "HomeDashboardSkeleton.tsx"), "utf8");
    expect(view).toContain("no-ambient");
    expect(skeleton).toContain("no-ambient");
  });

  it("gli strumenti rapidi usano capsule a estremità semicircolari", () => {
    const grid = readFileSync(join(HOME_DIR, "QuickToolsGrid.tsx"), "utf8");
    expect(grid).toContain("rounded-full");
  });

  it("le etichette degli strumenti rapidi non vengono mai troncate", () => {
    const grid = readFileSync(join(HOME_DIR, "QuickToolsGrid.tsx"), "utf8");
    expect(grid).not.toContain("truncate");
    expect(grid).not.toContain("line-clamp");
    // il testo può andare a capo con interlinea compatta
    expect(grid).toContain("leading-tight");
  });

  it("i token glass e le ombre tattili sono definiti nei fogli di stile", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    const tailwind = readFileSync(join(__dirname, "..", "..", "tailwind.config.ts"), "utf8");

    // token matericità (P34) — il tema chiaro li definisce, lo scuro li adatta
    expect(css).toContain("--glass-surface: rgba(255, 255, 255, 0.75)");
    expect(css).toContain("--glass-card-dark: rgba(45, 36, 32, 0.85)");
    expect(css).toContain("--glass-blur: blur(16px)");
    expect(css).toMatch(/\.dark[\s\S]*--glass-surface: rgb\(26 26 26 \/ 0\.80\)/);
    // ombre tattili
    expect(css).toContain("--shadow-tattile: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)");
    expect(css).toContain("--shadow-card-active: 0 20px 40px -10px rgba(0, 0, 0, 0.22)");
    // esposte come classi Tailwind semantiche
    expect(tailwind).toContain('tactile: "var(--shadow-tattile)"');
    expect(tailwind).toContain('"card-active": "var(--shadow-card-active)"');
    // utility vetro con fallback per reduced-transparency e high-contrast
    expect(css).toContain(".glass-tactile");
    expect(css).toMatch(/prefers-reduced-transparency: reduce[\s\S]*?\.glass-tactile/);
    expect(css).toMatch(/html\.high-contrast \.glass-tactile/);
  });

  it("le superfici della Home usano la materica glass tattile unificata", () => {
    const files = ["QuickToolsGrid.tsx", "DailyTimeline.tsx", "CourseHeroCard.tsx"];
    for (const name of files) {
      const content = readFileSync(join(HOME_DIR, name), "utf8");
      expect(content, name).toContain("glass-tactile");
      expect(content, name).toContain("shadow-tactile");
    }
  });

  it("la card percorso è sopraelevata: bordo chiaro, ombra eroe, luce di spigolo", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    const tailwind = readFileSync(join(__dirname, "..", "..", "tailwind.config.ts"), "utf8");

    // contorno chiaro translucido + ombra stratificata dedicata
    expect(hero).toContain("border-white/[0.12]");
    expect(hero).toContain("shadow-hero");
    expect(hero).not.toContain("shadow-level-2");
    expect(hero).toContain('shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]');
    expect(css).toContain("--shadow-hero-card: 0 10px 15px -3px rgba(0, 0, 0, 0.40), 0 4px 6px -2px rgba(0, 0, 0, 0.20), 0 24px 48px -12px rgba(0, 0, 0, 0.45)");
    expect(tailwind).toContain('hero: "var(--shadow-hero-card)"');
  });

  it("la CTA 'Riprendi lezione' è lo STESSO vetro della card di Studio", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");

    // gemello del bottone Riprendi di PathHero: color-mix currentColor 8%/20%
    expect(hero).toContain('"color-mix(in srgb, currentColor 8%, transparent)"');
    expect(hero).toContain('"color-mix(in srgb, currentColor 20%, transparent)"');
    expect(hero).toContain("rounded-full");
    expect(hero).toContain("h-11");
    expect(hero).not.toContain("glass-cool-black");
    expect(hero).not.toContain("bg-inverse-on-surface");
    // la vecchia classe vetro scura non deve tornare
    expect(css).not.toContain(".glass-cool-black");
  });

  it("il titolo del corso domina la gerarchia (3xl/4xl) con margini compatti", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("text-3xl");
    expect(hero).toContain("sm:text-4xl");
    // responsivo: il titolo lungo spezza le parole senza uscire dalla card
    expect(hero).toContain("break-words");
    expect(hero).toContain("min-w-0");
  });

  it("la ciambella della card corso è responsiva per gli schermi piccoli", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("h-14 w-14");
    expect(hero).toContain("sm:h-16 sm:w-16");
  });
});
