import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * 🛡️ CACCIATORE DI CARTA — test anti-regresso dello stile moderno.
 *
 * Il vecchio look "carta" (bordi neri/bianchi pieni, palette grezza
 * neutral/gray, chip invertite scritte a mano con dark:) è stato
 * radicato: l'app usa solo i token semantici di Erga (bg-card,
 * border-border/50, bg-primary/text-primary-foreground, shadow-level-*),
 * che si adattano da soli al tema chiaro e scuro.
 *
 * Eccezione voluta: src/components/landing — i phone mock della landing
 * sono illustrazioni di marketing con schermo sempre chiaro (brand
 * bianco/nero dichiarato in PRODUCT.md).
 */

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["src/components", "src/pages"];
const EXCLUDE = [join(ROOT, "src", "components", "landing")];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (EXCLUDE.some((ex) => p.startsWith(ex))) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

// Colori pieni senza opacità: l'equivalente moderno usa i token semantici
// o varianti con opacità (es. bg-white/15 sui vecchi telefonini landing).
const SOLID_RAW = [
  /(?<![\w-])bg-white(?![/\w-])/,
  /(?<![\w-])bg-black(?![/\w-])/,
  /(?<![\w-])text-black(?![/\w-])/,
  /(?<![\w-])border-black(?![/\w-])/,
  /(?<![\w-])border-white(?![/\w-])/,
];

// Palette grezza: neutral-N / gray-N non si adattano al tema scuro.
const RAW_PALETTE =
  /(?<![\w-])(?:bg|text|border|ring|from|to|via|fill|stroke|outline|shadow|decoration|divide|accent|caret)-(?:neutral|gray)-\d/;

describe("Cacciatore di carta (stile moderno)", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  it("nessun colore pieno bianco/nero o palette grezza nell'app", () => {
    const problems: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const re of SOLID_RAW) {
        if (re.test(content)) problems.push(`${file}: ${re.source}`);
      }
      if (RAW_PALETTE.test(content)) problems.push(`${file}: palette neutral/gray grezza`);
    }
    expect(problems).toEqual([]);
  });

  it("le chip invertite usano i token primari, non il nero grezzo del tema scuro", () => {
    const problems: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      // `dark:text-black` è palette grezza: il nero d'inchiostro di Erga è
      // gestito da text-primary-foreground, che si adatta da solo ai temi.
      if (/dark:text-black(?!\/)/.test(content)) {
        problems.push(`${file}: usare bg-primary/text-primary-foreground`);
      }
    }
    expect(problems).toEqual([]);
  });
});
