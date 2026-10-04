import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 🛡️ P29 × GUARDIA DELLA PANNA — test anti-regressione del bianco.
 *
 * Nel tema SCURO l'inchiostro di Erga è l'off-white #F2F0EF, non il bianco
 * puro: su fondo notte (#101717, DESIGN.md 1.1) il bianco pieno abbaglia.
 * Questo test fallisce se qualcuno riporta il bianco (o un quasi-bianco)
 * dentro il blocco `.dark`, o se cambia la definizione del gettone `--cream`.
 *
 * Eccezione D1 (DESIGN.md 1.1 §4): --primary-foreground di notte è bianco
 * pieno PERCHE' è testo sul riempimento ottanio (#087F83), non una tinta di
 * superficie: il documento lo prescrive esplicitamente.
 *
 * Nota: il tema CHIARO e la landing marketing restano volutamente
 * bianchi — qui non vengono toccati.
 */

const ROOT = join(__dirname, "..", "..");
const css = readFileSync(join(ROOT, "src", "index.css"), "utf-8");

/** Estrae il corpo di un blocco `selettore { ... }` bilanciando le graffe. */
function findBlock(selector: string, from = 0): { body: string; end: number } | null {
  const start = css.indexOf(`${selector} {`, from);
  if (start < 0) return null;
  let depth = 0;
  let i = css.indexOf("{", start);
  const open = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return { body: css.slice(open + 1, i), end: i };
}

/** Tutti i blocchi `.dark { ... }` dichiarati in index.css. */
function darkBlocks(): string[] {
  const out: string[] = [];
  let cursor = 0;
  for (;;) {
    const found = findBlock(".dark", cursor);
    if (!found) break;
    out.push(found.body);
    cursor = found.end;
  }
  return out;
}

/** Righe che dichiarano un gettone (`--nome: valore;`). */
function tokenLines(body: string): [string, string][] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^--[\w-]+\s*:/.test(line))
    .map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).replace(/;.*$/, "").trim()] as [string, string];
    });
}

describe("Guardia dell'off-white (#F2F0EF nel tema scuro)", () => {
  it("il gettone --cream esiste ed è esattamente #F2F0EF", () => {
    const match = css.match(/--cream:\s*([^;]+);/);
    expect(match, "manca il gettone --cream in :root").not.toBeNull();

    // 20 10.34% 94.31% → #F2F0EF (verificato canale per canale)
    const [, value] = match!;
    const hsl = value.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
    expect(hsl, `--cream deve essere una tupla HSL grezza, trovato "${value}"`).not.toBeNull();

    const [h, s, l] = hsl!.slice(1).map(Number);
    const sat = s / 100;
    const lig = l / 100;
    const a = sat * Math.min(lig, 1 - lig);
    const channel = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round((lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    };
    const hex = `#${[channel(0), channel(8), channel(4)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
    expect(hex).toBe("#F2F0EF");
  });

  it("nessun gettone del tema scuro torna al bianco puro o a un quasi-bianco", () => {
    // Le ombre sono veli tecnici (capello di luce): restano bianche apposta.
    const isShadow = (name: string) => name.startsWith("--shadow-");
    // D1: testo bianco sul riempimento ottanio, prescritto dal DESIGN.md 1.1 §4.
    const isBrandInkOnFill = (name: string) => name === "--primary-foreground";
    const problems: string[] = [];

    for (const body of darkBlocks()) {
      for (const [name, value] of tokenLines(body)) {
        if (isShadow(name) || isBrandInkOnFill(name)) continue;
        // bianco puro o grigio chiarissimo (>= 85%) usato come tinta piena
        const grey = value.match(/^0 0%\s+([\d.]+)%/);
        if (grey && Number(grey[1]) >= 85) {
          problems.push(`${name}: ${value} → usare var(--cream)`);
        }
        if (/#fff(f{3})?\b/i.test(value)) {
          problems.push(`${name}: ${value} → usare var(--cream)`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("i gettoni di testo del tema scuro puntano a --cream o all'accento chiaro di marca (D1)", () => {
    const merged = darkBlocks().join("\n");
    const tokens = Object.fromEntries(tokenLines(merged));
    // Testo corrente: panna #F2F0EF (via --cream), come sempre.
    const creamInks = [
      "--foreground",
      "--card-foreground",
      "--popover-foreground",
      "--nav-foreground",
      "--sidebar-foreground",
    ];
    for (const token of creamInks) {
      expect(tokens[token], `${token} manca nel blocco .dark`).toBeDefined();
      expect(tokens[token], `${token} non usa var(--cream)`).toContain("var(--cream)");
    }
    // D1: i valori di marca si leggono nel blocco .dark PRINCIPALE (quello
    // che dichiara il fondo #101717): il merge includerebbe anche gli
    // override legittimi di accessibilità (es. html.high-contrast .dark).
    const main = darkBlocks().find((b) => b.includes("--background: 180 18% 7.6%"));
    expect(main, "manca il blocco .dark principale D1").toBeDefined();
    const dark = Object.fromEntries(tokenLines(main!));
    // testo di marca e selezioni di notte = accento chiaro #8ECFD0;
    // riempimento d'azione = ottanio; bordo = #3D5351 (DESIGN.md 1.1 §4).
    expect(dark["--brand-deep"]).toBe("181 41% 69%");
    expect(dark["--accent-foreground"]).toBe("181 41% 69%");
    expect(dark["--primary"]).toBe("182 88% 27%");
    expect(dark["--border"]).toBe("175 15% 28%");
  });

  it("l'inchiostro automatico dei blocchi colorati è off-white, non bianco", () => {
    const auto = readFileSync(join(ROOT, "src", "lib", "autoContrast.ts"), "utf-8");
    expect(auto).toContain("242, g: 240, b: 239");
    expect(auto).toContain('"242 240 239"');
    expect(auto).not.toContain('"255 255 255"');

    // le utility CSS di supporto usano lo stesso ripiego
    expect(css).toContain("--contrast-ink: 242 240 239");
    expect(css).not.toContain("--contrast-ink, 255 255 255");
  });

  it("l'inchiostro sui fondi semantici resta leggibile in entrambi i temi", () => {
    // Di notte --success e --destructive sono grigi CHIARI: sopra ci vuole
    // inchiostro scuro. Questo test blocca il ritorno del bianco/panna lì.
    const dark = Object.fromEntries(tokenLines(darkBlocks().join("\n")));
    for (const token of ["--success-foreground", "--destructive-foreground"]) {
      const value = dark[token];
      expect(value, `${token} manca nel blocco .dark`).toBeDefined();
      expect(value).not.toContain("var(--cream)");
      const grey = value.match(/^0 0%\s+([\d.]+)%/);
      expect(grey, `${token} deve essere un grigio scuro, trovato "${value}"`).not.toBeNull();
      expect(Number(grey![1])).toBeLessThanOrEqual(20);
    }
  });
});
