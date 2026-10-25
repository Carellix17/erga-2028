import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("grana locale e alias piatti — design system v4", () => {
  const css = read("src/index.css");

  const tileUris = () =>
    [...css.matchAll(/--grain[a-z-]*tile: url\("([^"]+)"\)/g)].map((match) => match[1]);

  it("usa rumore SVG inline, locale, ripetibile e a scala fissa", () => {
    expect(css).toContain("--grain-tile:");
    expect(css).toContain("--grain-table-tile:");
    expect(css).toContain("--grain-paper-tile:");
    expect(css).toContain("--grain-scale: 160px");
    expect(css).toContain("--grain-blend: multiply");

    const tiles = tileUris();
    expect(tiles).toHaveLength(5);
    for (const uri of tiles) {
      expect(uri.startsWith("data:image/svg+xml")).toBe(true);
      expect(uri).toContain("xmlns='http://www.w3.org/2000/svg'");
      expect(uri).toContain("baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'");
    }
  });

  it("calibra tavolo, foglio e copertine per tema senza deformare la grana", () => {
    expect(css).toContain("--grain-alpha-cover: 0.05");
    expect(css).toMatch(/\.dark \{[\s\S]*?--grain-blend: screen/);

    const tableSlopes = [
      ...css.matchAll(/--grain-table-tile: url\("data:[^"]*slope='([\d.]+)'/g),
    ].map((match) => Number(match[1]));
    const paperSlopes = [
      ...css.matchAll(/--grain-paper-tile: url\("data:[^"]*slope='([\d.]+)'/g),
    ].map((match) => Number(match[1]));

    expect(tableSlopes).toHaveLength(2);
    expect(paperSlopes).toHaveLength(2);
    expect(tableSlopes[0]).toBeGreaterThan(paperSlopes[0]);
    expect(tableSlopes[1]).toBeGreaterThan(paperSlopes[1]);
    expect(tableSlopes[1]).toBeLessThan(tableSlopes[0]);
    expect(paperSlopes[1]).toBeLessThan(paperSlopes[0]);
  });

  it("applica la grana come background, mai come opacity del contenuto", () => {
    for (const [selector, variable] of [
      ["cover-grain", "--grain-tile"],
      ["table-grain", "--grain-table-tile"],
      ["paper-grain", "--grain-paper-tile"],
    ]) {
      const rule = css.match(new RegExp(`\\.${selector} \\{[\\s\\S]*?\\}`))?.[0] ?? "";
      expect(rule).toContain(`background-image: var(${variable})`);
      expect(rule).toContain("background-size: var(--grain-scale)");
      if (selector === "cover-grain") {
        expect(rule).toContain("opacity: var(--grain-alpha-cover)");
      } else {
        expect(rule).not.toMatch(/(^|[^-])opacity\s*:/);
      }
    }

    expect(css).toMatch(
      /prefers-reduced-transparency: reduce[\s\S]*?\.paper-grain,[\s\S]*?\.table-grain[\s\S]*?background-image: none/,
    );
    expect(css).toMatch(/html\.high-contrast \.paper-grain,[\s\S]*?background-image: none/);
    expect(css).toMatch(/\.cover-grain \{[\s\S]*?pointer-events: none/);
  });

  it("la Home non applica grana generale: gli alias carta restano piatti", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    expect(layout).toContain('isHome && "table-grain"');
    expect(css).toMatch(/\.paper-grain, \.table-grain \{ background-image: none; \}/);

    for (const file of [
      "src/components/home/DailyTimeline.tsx",
      "src/components/home/HomeDashboardSkeleton.tsx",
      "src/components/home/HomeView.tsx",
      "src/components/home/CognitiveTelemetry.tsx",
    ]) {
      expect(read(file), file).not.toContain("paper-grain");
    }

    for (const file of [
      "src/components/layout/BottomNav.tsx",
      "src/components/studio/CourseCardBackground.tsx",
    ]) {
      expect(read(file), file).not.toContain("paper-grain");
      expect(read(file), file).not.toContain("table-grain");
    }
    expect(read("src/components/layout/BottomNav.tsx")).not.toContain("cover-grain");
  });

  it("la card corso riusa soltanto la copertina locale di Studio", () => {
    const hero = read("src/components/home/CourseHeroCard.tsx");
    const background = read("src/components/studio/CourseCardBackground.tsx");
    expect(hero).not.toContain("paper-grain");
    expect(hero).toContain("CourseCardBackground");
    expect(hero).toContain("courseCoverVars");
    expect(css).toMatch(/\.paper-grain, \.table-grain \{ background-image: none; \}/);
    expect(background).toContain("cover-grain");
    expect(background).not.toContain("paper-grain");
    expect(background).not.toContain("table-grain");
  });

  it("rispetta trasparenza ridotta, contrasto elevato e forced colors", () => {
    expect(css).toMatch(/prefers-reduced-transparency: reduce[\s\S]*?\.paper-grain/);
    expect(css).toContain("html.high-contrast .paper-grain");
    expect(css).toContain("(forced-colors: active)");
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\), \(forced-colors: active\)[\s\S]*?\.cover-grain \{ display: none/);
  });
});
