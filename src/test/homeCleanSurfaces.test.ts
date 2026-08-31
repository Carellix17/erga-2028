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
});
