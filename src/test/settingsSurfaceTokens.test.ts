import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf-8");

describe("superfici delle Impostazioni — token v3", () => {
  it("definisce pannelli e righe opachi con bordi e ombre del sistema", () => {
    const css = read("src/index.css");

    expect(css).toContain(".erga-settings-panel");
    expect(css).toContain(".erga-list-item");
    expect(css).toContain(".erga-list-item-icon");
    expect(css).toContain("border: 1px solid hsl(var(--border))");
    expect(css).toContain("background-color: hsl(var(--card))");
    expect(css).toContain("box-shadow: var(--shadow-level-1)");
    expect(css).toContain("background-color: hsl(var(--surface-secondary))");
    expect(css).not.toContain("background-color: hsl(var(--card) / 0.92)");
    const surfaces = css.slice(css.indexOf(".erga-settings-panel"), css.indexOf("/* ═══════ M3 SURFACE CONTAINERS"));
    expect(surfaces).not.toContain("backdrop-filter");
  });

  it("riusa le superfici e i controlli condivisi nelle pagine Impostazioni", () => {
    const pages = [
      "src/pages/settings/SettingsIndex.tsx",
      "src/pages/settings/SettingsLanguage.tsx",
      "src/pages/settings/SettingsAppearance.tsx",
      "src/pages/settings/SettingsAccessibility.tsx",
      "src/pages/settings/SettingsAccount.tsx",
      "src/pages/settings/SettingsTerms.tsx",
    ].map(read);

    expect(pages.some((content) => content.includes("erga-settings-panel"))).toBe(true);
    expect(pages.some((content) => content.includes("erga-list-item"))).toBe(true);
    expect(pages.some((content) => content.includes("erga-list-item-icon"))).toBe(true);

    expect(read("src/pages/settings/SettingsIndex.tsx")).toContain('className="erga-list-item');
    expect(read("src/pages/settings/SettingsAppearance.tsx")).toContain('className="erga-list-item flex w-full');
    expect(read("src/pages/settings/SettingsLanguage.tsx")).toContain('className="erga-list-item flex w-full');
    expect(read("src/pages/settings/SettingsAccessibility.tsx")).toContain("erga-list-item h-12 rounded-button");
    expect(read("src/pages/settings/SettingsAppearance.tsx")).not.toContain("erga-list-item-icon");
  });
});
