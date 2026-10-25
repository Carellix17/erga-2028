import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * 🛡️ GUARDIA DELLE SUPERFICI — Home, design system v4.0
 * «Swiss Cognitive Grid + Tactile Studio».
 *
 * La Home è una griglia continua di celle piatte: superficie piena, bordo di
 * griglia 1px, nessuna ombra morbida, nessun blur. Il velo satinato resta
 * confinato alle copertine dei corsi (fuori dalla Home). L'unica ombra del
 * sistema è quella rigida 2px della CTA primaria.
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

  it("gli strumenti rapidi sono celle squadrate con chip quieto, etichette mai troncate", () => {
    const grid = readFileSync(join(HOME_DIR, "QuickToolsGrid.tsx"), "utf8");
    // celle della griglia: raggio card 0px secondo DESIGN.md v4.
    expect(grid).toContain("rounded-card");
    expect(grid).toContain("rounded-control");
    // le etichette non vengono MAI troncate: vanno a capo con interlinea compatta
    expect(grid).not.toContain("truncate");
    expect(grid).not.toContain("line-clamp");
    expect(grid).toContain("leading-tight");
    // target touch ≥ 44px
    expect(grid).toContain("min-h-[52px]");
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

  it("le superfici della Home restano SOLIDE e piatte: nessun blur né satinato", () => {
    const files = readdirSync(HOME_DIR).filter((name) => name.endsWith(".tsx"));
    for (const name of files) {
      const content = readFileSync(join(HOME_DIR, name), "utf8");
      // v4: la Home non ospita più il velo satinato, che resta alle copertine.
      expect(content, name).not.toMatch(/backdrop-filter|backdrop-blur|glass-tactile|btn-satin/);
    }
  });

  it("la cella corso è piatta: superficie piena, niente copertina astratta né ombre", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    // Cella della griglia continua: raggio 0, superficie piena, nessuna ombra.
    expect(hero).toContain("min-h-[360px]");
    expect(hero).toContain("bg-card p-6 sm:p-8");
    expect(hero).not.toContain("rounded-hero");
    expect(hero).not.toContain("shadow-level-3");
    expect(hero).not.toContain("CourseCardBackground");
    expect(hero).not.toContain("courseCoverVars");
    // Il sistema copertine (grana satinata, forme nette) resta a Studio.
    expect(bg).toContain("cover-grain");
    expect(bg).not.toContain("blur-");
    expect(bg).not.toContain("orb-main");
    expect(bg).not.toContain("orb-secondary");
  });

  it("la CTA 'Riprendi/Continua' è un pulsante primario solido, pieno su telefono", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain('<Button onClick={onPrimaryCta} className="min-h-12 w-full sm:w-auto">');
    expect(hero).not.toContain("btn-satin");
    // la vecchia CTA semiopaca color-mix non deve tornare
    expect(hero).not.toContain("color-mix(in srgb, currentColor 12%");
  });

  it("il titolo del corso va a capo senza uscire dalla cella e non viene mai troncato", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    // Scala fissa (36px → 40px da sm) e a capo controllato: mai ridurre i caratteri.
    expect(hero).toContain(
      "max-w-[22ch] break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl",
    );
    expect(hero).not.toMatch(/truncate|line-clamp/);
    // la voce focale Radja non guida il prodotto (resta al Login)
    expect(hero).not.toContain("font-radja");
  });

  it("usa i token v4 e le superfici piatte documentate", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    expect(css).toContain("--canvas: 45.0000 26.6667% 94.1176%"); // #F4F2EC
    expect(css).toContain("--surface-primary: 42.8571 41.1765% 96.6667%"); // #FAF8F3
    expect(css).toContain("--surface-secondary: 42.8571 25.0000% 89.0196%"); // #EAE6DC
    // Superfici piatte: le ombre di sistema sono spente, anche gli alias legacy.
    expect(css).toContain("--shadow-level-3: none");
    expect(css).toContain("--shadow-tattile: none");
    expect(css).toContain("--shadow-hero-card: none");
    // L'unica ombra del sistema è quella rigida 2px della CTA primaria.
    const button = readFileSync(join(__dirname, "..", "components", "ui", "button.tsx"), "utf8");
    expect(button).toContain("shadow-[2px_2px_0px_#11120D]");
    // la copertina non usa gradienti: campo pieno + forme nette
    const bg = readFileSync(join(__dirname, "..", "components", "studio", "CourseCardBackground.tsx"), "utf8");
    expect(bg).not.toContain("linear-gradient");
  });

  it("l'avanzamento del percorso è una barra lineare con percentuale in mono tabulare", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    // Accessibile: ruolo progressbar con etichetta e valori min/max/now.
    expect(hero).toContain('role="progressbar"');
    expect(hero).toContain("aria-valuemin={0}");
    expect(hero).toContain("aria-valuemax={100}");
    expect(hero).toContain("h-1 flex-1 bg-secondary");
    expect(hero).toContain("bg-cognitive");
    // Le misure usano il mono con cifre tabulari (DESIGN.md v4).
    expect(hero).toContain("font-mono text-sm tabular-nums");
    // la ciambella v3 non c'è più
    expect(hero).not.toContain("h-14 w-14");
    expect(hero).not.toContain("sm:h-16 sm:w-16");
  });
});
