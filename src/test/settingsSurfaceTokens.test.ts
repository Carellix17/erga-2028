import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf-8");

describe("superfici delle Impostazioni — token v3", () => {
  it("definisce pannelli avorio a 24px, senza ombra e senza vetro", () => {
    const css = read("src/index.css");

    expect(css).toContain(".erga-settings-panel");
    expect(css).toContain(".erga-list-item");
    expect(css).toContain(".erga-list-item-icon");
    const surfaces = css.slice(css.indexOf(".erga-settings-panel"), css.indexOf("/* ═══════ M3 SURFACE CONTAINERS"));
    expect(surfaces).toContain("background-color: #FFFBF4");
    expect(surfaces).toContain("border-radius: 24px");
    expect(surfaces).toContain("box-shadow: none");
    expect(surfaces).not.toContain("backdrop-filter");
    expect(surfaces).not.toContain("box-shadow: var(--shadow-level-1)");
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
    expect(read("src/pages/settings/SettingsAppearance.tsx")).toContain("un'unica superficie scura");
    expect(read("src/pages/settings/SettingsAppearance.tsx")).not.toContain("Chiaro");
    expect(read("src/pages/settings/SettingsAppearance.tsx")).not.toContain("Automatico");
    expect(read("src/pages/settings/SettingsLanguage.tsx")).toContain('className="erga-list-item flex w-full');
    expect(read("src/pages/settings/SettingsAccessibility.tsx")).toContain("erga-list-item h-12 rounded-[24px]");
    expect(read("src/pages/settings/SettingsAppearance.tsx")).not.toContain("erga-list-item-icon");
  });
});
