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

  it("le superfici della Home sono SOLIDE a strati: nessun backdrop-filter", () => {
    const files = readdirSync(HOME_DIR).filter((name) => name.endsWith(".tsx"));
    for (const name of files) {
      const content = readFileSync(join(HOME_DIR, name), "utf8");
      // P36: prestazioni mobile — niente blur su card o liste scorrevoli
      expect(content, name).not.toMatch(/backdrop-filter|backdrop-blur|glass-tactile/);
    }
    const grid = readFileSync(join(HOME_DIR, "QuickToolsGrid.tsx"), "utf8");
    const timeline = readFileSync(join(HOME_DIR, "DailyTimeline.tsx"), "utf8");
    expect(grid).toContain("bg-card");
    expect(timeline).toContain("bg-card");
    expect(grid).toContain("shadow-tactile");
    expect(timeline).toContain("shadow-tactile");
    // icone delle capsule in chip circolare contrastato
    expect(grid).toContain("rounded-full");
  });

  it("la card percorso è sopraelevata e di notte è la hero avorio P36", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    const tailwind = readFileSync(join(__dirname, "..", "..", "tailwind.config.ts"), "utf8");

    // ombra stratificata dedicata + filo sottilissimo
    expect(hero).toContain("shadow-hero");
    expect(hero).not.toContain("shadow-level-2");
    expect(hero).toContain("dark:border-black/[0.08]");
    // di notte la card è avorio #F4F1EA con inchiostro #121214
    expect(hero).toContain("dark:bg-surface-cream");
    expect(hero).toContain("dark:text-surface-cream-foreground");
    expect(css).toContain("--shadow-hero-card: 0 10px 15px -3px rgba(0, 0, 0, 0.40), 0 4px 6px -2px rgba(0, 0, 0, 0.20), 0 24px 48px -12px rgba(0, 0, 0, 0.45)");
    expect(tailwind).toContain('hero: "var(--shadow-hero-card)"');
  });

  it("la CTA 'Riprendi lezione' è una pillola scura sull'avorio (px-6)", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");

    expect(hero).toContain("rounded-full");
    expect(hero).toContain("h-12");
    expect(hero).toContain("px-6");
    // scura sulla card avorio di notte, avorio sull'inchiostro di giorno
    expect(hero).toContain("bg-inverse-on-surface");
    expect(hero).toContain("dark:bg-surface-cream-foreground");
    // la vecchia classe vetro scura non deve tornare
    expect(css).not.toContain(".glass-cool-black");
  });

  it("il titolo del corso domina la gerarchia in Radja (3xl/4xl)", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("font-radja");
    expect(hero).toContain("text-3xl");
    expect(hero).toContain("sm:text-4xl");
    // titoli lunghi: un gradino sotto, per non gonfiare la card
    expect(hero).toContain("text-2xl");
    expect(hero).toContain("LONG_COURSE_TITLE_THRESHOLD");
    // responsivo: il titolo lungo spezza le parole senza uscire dalla card
    expect(hero).toContain("break-words");
    expect(hero).toContain("min-w-0");
  });

  it("i token P36 dark luxury sono centrali: avorio, antracite, Radja", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    const tailwind = readFileSync(join(__dirname, "..", "..", "tailwind.config.ts"), "utf8");
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");

    // superfici definite una volta sola e riuse ovunque
    expect(css).toContain("--surface-cream: 42 31% 94%");
    expect(css).toContain("--surface-cream-foreground: 240 5% 8%");
    expect(css).toContain("--surface-cream-muted: 240 3% 30%");
    expect(css).toContain("--surface-dark-card: 240 9% 8.6%");
    expect(css).toContain("--background: 240 9% 4.3%");
    expect(css).toContain("--card: var(--surface-dark-card)");
    expect(css).toContain("--border: var(--cream) / 0.07");
    // font display Radja self-hosted + utility Tailwind
    expect(css).toContain('font-family: "Radja"');
    expect(css).toContain('url("/fonts/Radja-q2MP5.ttf")');
    expect(tailwind).toContain("radja: ['Radja'");
    expect(hero).toContain("font-radja");
  });

  it("la ciambella della card corso è responsiva per gli schermi piccoli", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("h-14 w-14");
    expect(hero).toContain("sm:h-16 sm:w-16");
  });
});
