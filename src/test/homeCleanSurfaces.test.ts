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
    expect(css).toMatch(/\.dark[\s\S]*--glass-surface: rgb\(20 29 29 \/ 0\.85\)/);
    // ombre tattili (D1, DESIGN.md 1.1 §6: ordinaria e protagonista)
    expect(css).toContain("--shadow-tattile: 0 2px 6px rgba(24, 21, 22, 0.06)");
    expect(css).toContain("--shadow-card-active: 0 10px 28px rgba(24, 21, 22, 0.12), 0 2px 6px rgba(24, 21, 22, 0.05)");
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

  it("D2: la card corso è protagonista — squadrata, sollevata, composizione astratta per materia", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");

    // ombra protagonista (§6) e composizione astratta condivisa con Studio
    expect(hero).toContain("shadow-hero");
    expect(hero).not.toContain("shadow-level-2");
    expect(hero).toContain("CourseCardBackground");
    expect(hero).toContain("getSubjectAccent");
    // geometria squadrata: niente capsule, bordo dal token
    expect(hero).not.toContain("rounded-full");
    expect(hero).toContain("border-border");
    // ombra protagonista D1 al posto della vecchia goccia P35
    expect(css).toContain("--shadow-hero-card: 0 10px 28px rgba(24, 21, 22, 0.14)");
  });

  it("D2: la CTA 'Continua' è semiopaca, a piena larghezza e senza capsule", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");

    expect(hero).toContain("h-11");
    expect(hero).toContain("w-full");
    // semiopaca con fondo sufficiente (§6): 12% di currentColor + bordo 24%
    expect(hero).toContain("color-mix(in srgb, currentColor 12%, transparent)");
    expect(hero).toContain("color-mix(in srgb, currentColor 24%, transparent)");
    expect(hero).not.toContain("rounded-full");
    // la vecchia classe vetro scura non deve tornare
    expect(css).not.toContain(".glass-cool-black");
  });

  it("D2: il titolo del corso domina la gerarchia in Ubuntu Sans (3xl/4xl)", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("font-display");
    expect(hero).toContain("text-3xl");
    expect(hero).toContain("sm:text-4xl");
    // titoli lunghi: un gradino sotto, per non gonfiare la card
    expect(hero).toContain("text-2xl");
    expect(hero).toContain("LONG_COURSE_TITLE_THRESHOLD");
    // responsivo: il titolo lungo spezza le parole senza uscire dalla card
    expect(hero).toContain("break-words");
    expect(hero).toContain("min-w-0");
    // la voce focale Radja non guida più il redesign (DESIGN.md 1.1)
    expect(hero).not.toContain("font-radja");
  });

  it("D2: i token della veste — materia viva, notte teal, ombre controllate", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");

    // notte proposta del §4 e superficie card
    expect(css).toContain("--background: 180 18% 7.6%");
    expect(css).toContain("--card: var(--surface-dark-card)");
    // la composizione parte dal colore materia, non da un gradiente identico
    expect(hero).toContain("subjectColor");
    // ombre dei tre livelli (§6)
    expect(css).toContain("--shadow-level-3: 0 10px 28px rgba(24, 21, 22, 0.12)");
  });

  it("la ciambella della card corso è responsiva per gli schermi piccoli", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("h-14 w-14");
    expect(hero).toContain("sm:h-16 sm:w-16");
  });
});
