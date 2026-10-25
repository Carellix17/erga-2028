import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("layout responsive Home e shell", () => {
  it("mantiene scroll e spazio dock su telefono, rail su tablet e navigazione desktop", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    const nav = read("src/components/layout/BottomNav.tsx");

    // Mobile: viewport dinamico, pagina scrollabile e spazio sufficiente al dock.
    expect(layout).toContain("min-h-screen min-h-dvh");
    expect(layout).toContain("pb-[calc(5.5rem+env(safe-area-inset-bottom))]");
    expect(nav).toContain("fixed bottom-0");
    expect(nav).toContain("mb-[max(env(safe-area-inset-bottom,0px),0.75rem)]");

    // Tablet/desktop: shell a viewport pieno, contenuto scrollabile, rail/sidebar raggiungibili.
    expect(layout).toContain("md:h-dvh md:min-h-0 md:overflow-hidden");
    expect(layout).toContain("md:overflow-x-hidden md:overflow-y-auto");
    expect(nav).toContain("md:flex md:h-full md:w-[84px]");
    expect(nav).toContain("lg:w-64");
  });

  it("non impone larghezze fisse né troncamenti alle sezioni Home", () => {
    const home = read("src/components/home/HomeView.tsx");
    const course = read("src/components/home/CourseHeroCard.tsx");
    const timeline = read("src/components/home/DailyTimeline.tsx");

    expect(home).toContain("min-w-0");
    expect(home).toContain("pt-16");
    expect(read("src/components/home/HomeDashboardSkeleton.tsx")).toContain("pt-16");
    expect(home).toContain("grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]");
    expect(home).not.toContain("cognitive-grid");
    expect(course).toContain("break-words");
    expect(timeline).toContain("break-words");
    expect(timeline).not.toContain("truncate");
  });
});
