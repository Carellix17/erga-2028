import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal";

const root = join(__dirname, "..", "..");
const skipDirs = new Set(["node_modules", "dist", ".git", "coverage", ".bun"]);
const codeExt = new Set([".ts", ".tsx", ".js", ".jsx", ".sql", ".html"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (codeExt.has(name.slice(name.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

describe("email privacy", () => {
  it("usa l'indirizzo deciso e non il segnaposto", () => {
    expect(PRIVACY_CONTACT_EMAIL).toBe("privacy@erga-learning.app");
    const forbidden = "TODO-" + "email-privacy";
    const hits = walk(root).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      if (!text.includes(forbidden)) return [];
      return [file.slice(root.length + 1)];
    });
    expect(hits).toEqual([]);
  });

  it("tiene la frase del 24 novembre nella sezione dei contatori", () => {
    const privacy = readFileSync(join(root, "src/pages/legal/Privacy.tsx"), "utf8");
    expect(privacy).toContain(
      "Dal 24 novembre 2026 questi contatori non registrano chi sei. I dati raccolti prima di quella data vengono cancellati entro 90 giorni.",
    );
  });
});
