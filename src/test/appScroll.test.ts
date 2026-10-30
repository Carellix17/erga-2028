import { describe, expect, it } from "vitest";
import { saveDepartingAppTabScroll, type AppScrollPositions } from "@/lib/appScroll";

describe("browser history scroll memory", () => {
  it("saves the current tab before Back or Forward switches to another app tab", () => {
    const positions: AppScrollPositions = { home: 40, piano: 20, studio: 30, core: 10 };

    saveDepartingAppTabScroll("/app", "?tab=home", "studio", 715, positions);

    expect(positions.studio).toBe(715);
  });

  it("does not replace a tab position when Back stays in the same tab or leaves settings", () => {
    const positions: AppScrollPositions = { home: 40, piano: 20, studio: 30, core: 10 };

    saveDepartingAppTabScroll("/app", "?tab=studio", "studio", 800, positions);
    saveDepartingAppTabScroll("/app/impostazioni", "?tab=home", "studio", 900, positions);

    expect(positions.studio).toBe(30);
  });
});
