import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * 🛡️ GUARDIA DELLE SUPERFICI PULITE — Home del pilota V2-01
 * (DESIGN.md 2.1 «Carta contemporanea»).
 *
 * La Home resta senza ombre nere pesanti, bagliori o gradienti parassiti:
 * l'elevazione arriva solo dai token del sistema (ombre corte, §6) e il
 * tavolo è piatto. L'UNICA superficie con velo è l'azione satinata sulla
 * copertina del corso (btn-satin, §4): blur locale e dichiarato.
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
    // card di strumenti: raggio card 24 (2.1 §6)
    expect(grid).toContain("rounded-card");
    // le etichette non vengono MAI troncate: vanno a capo con interlinea compatta
    expect(grid).not.toContain("truncate");
    expect(grid).not.toContain("line-clamp");
    expect(grid).toContain("leading-tight");
  });

  it("i token del velo satinato sono definiti con fallback opaco (2.1 §4)", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    // satinato: carta all'80% (giorno) / 85% (notte), blur locale 10px
    expect(css).toContain(".btn-satin {");
    expect(css).toMatch(/background-color: rgb\(var\(--satin-bg\) \/ 0\.8\)/);
    expect(css).toMatch(/backdrop-filter: blur\(10px\)/);
    expect(css).toMatch(/\.dark \.btn-satin \{[\s\S]*?0\.85/);
    // fallback: carta piena senza blur
    expect(css).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\)/);
    expect(css).toMatch(/prefers-reduced-transparency: reduce[\s\S]*?\.btn-satin/);
    // testo opaco: la trasparenza riguarda il fondo, mai il pulsante intero
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

  it("V2-01: la card corso è la copertina del corso — raggio 32, composizione, ombra protagonista", () => {
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

  it("V2-01: la CTA 'Riprendi/Continua' è satinata a pillola sulla copertina (2.1 §4)", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("btn-satin");
    expect(hero).toContain("w-full");
    // la vecchia CTA semiopaca color-mix non deve tornare
    expect(hero).not.toContain("color-mix(in srgb, currentColor 12%");
  });

  it("V2-01: il titolo del corso è serif (Lora) e spezza le parole senza uscire", () => {
    const hero = readFileSync(join(HOME_DIR, "CourseHeroCard.tsx"), "utf8");
    expect(hero).toContain("font-display");
    expect(hero).toContain("font-medium");
    expect(hero).toContain("break-words");
    expect(hero).toContain("min-w-0");
    // la voce focale Radja non guida il prodotto (resta al Login)
    expect(hero).not.toContain("font-radja");
  });

  it("V2-01: i token della veste — tavolo avorio, notte calda, ombre corte", () => {
    const css = readFileSync(join(__dirname, "..", "..", "src", "index.css"), "utf8");
    // tavolo e carta (2.1 §3)
    expect(css).toContain("--background: 44 38% 94%");
    expect(css).toContain("--card: 50 100% 99%");
    // ombre corte senza aloni grigi (§6): protagonista = livello 3
    expect(css).toContain(
      "--shadow-level-3: 0 2px 4px rgba(37, 38, 35, 0.04), 0 10px 24px rgba(37, 38, 35, 0.08)",
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
