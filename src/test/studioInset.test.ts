import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/** Classi di un tag, in qualsiasi ordine e con utility extra. */
function classTokens(source: string, marker: string): string[] {
  const markerAt = source.indexOf(marker);
  expect(markerAt, marker).toBeGreaterThanOrEqual(0);
  const tagStart = source.lastIndexOf("<", markerAt);
  const tagEnd = source.indexOf(">", markerAt);
  const className = source.slice(tagStart, tagEnd).match(/className="([^"]+)"/);
  expect(className?.[1], marker).toEqual(expect.any(String));
  return className![1].trim().split(/\s+/);
}

describe("inset di Studio — stesso margine della Home", () => {
  it("la scheda Studio eredita il padding del guscio e non esce nel gutter", () => {
    const index = read("src/pages/Index.tsx");
    const layout = read("src/components/layout/AppLayout.tsx");

    expect(layout).toContain("px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6");
    expect(index).toContain('activeTab === "studio" ? "bg-[#0a0a0a]" : undefined');
    expect(index).not.toContain("-mx-4");
    expect(index).not.toContain("sm:-mx-6");

    const workspace = index.slice(index.indexOf("study-workspace"), index.indexOf("study-workspace") + 180);
    expect(workspace).toContain("bg-[#0a0a0a]");
    expect(workspace).not.toContain("border");
    expect(workspace).not.toContain("bg-sheet");
    expect(workspace).not.toContain("grid-cols");
    expect(index).not.toContain("<aside");
    expect(index).not.toContain("Materiali e lettura");
  });

  it("lettore, verifica e fogli a tutto schermo tengono 16/24 px di canvas ai lati", () => {
    const lesson = read("src/components/studio/FullscreenLesson.tsx");
    const test = read("src/components/studio/FinalTest.tsx");
    const practice = read("src/components/studio/StudioPractice.tsx");
    const generation = read("src/components/studio/ModuleGenerationScreen.tsx");
    const picker = read("src/components/studio/PathHero.tsx");
    const selector = read("src/components/studio/CourseSelector.tsx");
    const upload = read("src/components/upload/UploadSheet.tsx");

    expect(lesson).toContain(
      'embedded ? "relative min-h-[32rem] lg:h-[calc(100dvh-8rem)]" : "fixed inset-y-0 left-4 right-4 z-50 h-dvh animate-lesson-sheet-in sm:left-6 sm:right-6"',
    );
    expect(lesson).toContain(
      'className="lesson-reader studio-surface flex h-full min-h-0 min-w-0 flex-col bg-[#FFFBF4] text-[#0a0a0a]"',
    );
    // Gate di apertura: schermo intero, con 16 px di canvas ai lati (24 px da sm).
    const openingGate = classTokens(lesson, "aria-busy={!failed}");
    expect(openingGate).toEqual(expect.arrayContaining(["fixed", "inset-0", "px-4", "sm:px-6"]));
    expect(test).toContain('className="fixed inset-0 z-50 bg-[#0a0a0a] px-4 focus:outline-none sm:px-6"');
    expect(test).toContain("bg-[#FFFBF4]");

    expect(practice).toContain("absolute inset-0 bg-scrim/40 backdrop-blur-sm");
    expect(practice).toContain(
      "absolute inset-x-4 bottom-0 flex h-[100dvh] flex-col rounded-t-dialog border border-border bg-popover text-foreground shadow-level-4 sm:inset-x-6",
    );
    expect(generation).toContain("bg-scrim/40 px-4 animate-fade-in sm:px-6");
    expect(picker).toContain('className="flex min-h-0 w-full flex-1 flex-col px-4 py-6 sm:px-6"');
    expect(selector).toContain("bg-scrim/60 px-4 py-4 sm:px-6");
    expect(upload).toContain("material-sheet inset-x-4");
    expect(upload).toContain("sm:inset-x-6");
  });
});
