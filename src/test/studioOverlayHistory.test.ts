import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(
  join(process.cwd(), "src/components/studio/StudioView.tsx"),
  "utf8",
);

describe("Studio lesson overlay history", () => {
  it("routes course and context changes through closeLessonReader", () => {
    expect(studioSource).toMatch(/useEffect\(\(\) => \{\s*closeLessonReader\(\);[\s\S]*?\}, \[effectiveContextId, closeLessonReader\]\);/);
    expect(studioSource).toMatch(/const handleSelectCourse = \(contextId: string\) => \{[\s\S]*?closeLessonReader\(\);/);

    // Direct state closure is reserved for the close helper and the browser-Back
    // response, whose history entry has already been consumed by the browser.
    expect(studioSource.match(/setActiveLessonIndex\(null\)/g)).toHaveLength(2);
  });
});
