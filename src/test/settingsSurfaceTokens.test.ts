import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");
const read = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf-8");

describe("settings surface tokens", () => {
  it("definisce superfici riusabili per pannelli, righe e badge icona", () => {
    const css = read("src/index.css");

    expect(css).toContain(".erga-settings-panel");
    expect(css).toContain(".erga-list-item");
    expect(css).toContain(".erga-list-item-icon");

    expect(css).toContain("background-color: rgb(26 26 26 / 0.80)");
    expect(css).toContain("border-color: hsl(0 0% 100% / 0.10)");
    expect(css).toContain("background-color: hsl(var(--card) / 0.92)");
    expect(css).toContain("border: 1px solid hsl(var(--ink) / 0.05)");
  });

  it("riusa i token sulle pagine impostazioni e sulle righe secondarie", () => {
    const files = [
      "src/pages/settings/SettingsIndex.tsx",
      "src/pages/settings/SettingsLanguage.tsx",
      "src/pages/settings/SettingsAppearance.tsx",
      "src/pages/settings/SettingsAccessibility.tsx",
      "src/pages/settings/SettingsAccount.tsx",
      "src/pages/settings/SettingsTerms.tsx",
    ].map(read);

    expect(files.some((content) => content.includes("erga-settings-panel"))).toBe(true);
    expect(files.some((content) => content.includes("erga-list-item"))).toBe(true);
    expect(files.some((content) => content.includes("erga-list-item-icon"))).toBe(true);

    expect(read("src/pages/settings/SettingsIndex.tsx")).toContain("className=\"erga-list-item");
    expect(read("src/pages/settings/SettingsAppearance.tsx")).toContain("className=\"erga-list-item flex w-full");
    expect(read("src/pages/settings/SettingsLanguage.tsx")).toContain("className=\"erga-list-item flex w-full");
    expect(read("src/pages/settings/SettingsAccessibility.tsx")).toContain("erga-list-item h-12 rounded-button");
  });
});
