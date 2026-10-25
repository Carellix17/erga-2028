import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("creazione di un nuovo percorso in Studio", () => {
  it("mette la CTA prima della hero del corso", () => {
    const studio = read("src/components/studio/StudioView.tsx");
    const createButton = studio.indexOf('aria-label="Crea un nuovo percorso di studio"');
    const courseHero = studio.indexOf("<PathHero", createButton);

    expect(createButton).toBeGreaterThan(-1);
    expect(courseHero).toBeGreaterThan(createButton);
    expect(studio).toContain("h-auto min-h-12 w-full justify-center whitespace-normal");
  });

  it("su telefono apre lo sheet dal basso e lascia separato il pannello materiali", () => {
    const index = read("src/pages/Index.tsx");
    const studio = read("src/components/studio/StudioView.tsx");
    const uploadSheet = read("src/components/upload/UploadSheet.tsx");

    expect(index).toContain('if (activeTab === "studio" && isMobile)');
    expect(index).toContain("setShowUpload(true)");
    expect(index).toContain('embedded={activeTab === "studio" && !showUpload}');
    expect(index).toContain("onCreatePathClick={openCreatePath}");
    expect(studio).toContain("onUploadClick={createPath}");
    expect(uploadSheet).toContain('side="bottom"');
  });
});
