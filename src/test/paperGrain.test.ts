import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * V2-02 — Grana della carta sulla Home (DESIGN.md 2.1 §3 «Grana»).
 *
 * Regole difese da questi controlli:
 *  · UNA sola texture condivisa (stesso rumore delle copertine), asset
 *    inline locale e statico, senza giunte (stitchTiles);
 *  · il velo è SEMPRE un background-image: dipinto sotto testo e
 *    controlli, non intercetta click, assente dall'albero accessibile;
 *  · nessun opacity sul contenitore con contenuto: l'intensità della
 *    carta vive nel canale alpha del tile (2% giorno, 1,2% notte);
 *  · scala fissa 160px: telefono e desktop vedono la stessa grana;
 *  · ambienza SOLO Home (gate isHome + componenti src/components/home),
 *    mai su Studio, lezioni, formule, campi, calendario, grafici, dock.
 */
describe("grana della carta (V2-02)", () => {
  const css = read("src/index.css");

  it("dichiara i token: texture locale unica, scala fissa, blend per tema", () => {
    expect(css).toContain("--grain-tile:");
    expect(css).toContain("--grain-paper-tile:");
    expect(css).toContain("--grain-scale: 160px");
    expect(css).toContain("--grain-blend: multiply");
    // texture locale: data URI inline (l'unico "http" è il namespace SVG,
    // un identificatore, non una richiesta di rete)
    const tiles = [...css.matchAll(/--grain[a-z-]*tile: url\("([^"]+)"\)/g)];
    expect(tiles.length).toBe(3); // copertine + carta giorno + carta notte
    for (const [, uri] of tiles) {
      expect(uri.startsWith("data:image/svg+xml")).toBe(true);
      expect(uri).toContain("xmlns='http://www.w3.org/2000/svg'");
    }
  });

  it("giorno e notte condividono lo stesso rumore con intensità calibrate", () => {
    // stessa famiglia di rumore in tutti i tile: frequenza, ottave, giunte
    const noise = [
      ...css.matchAll(/baseFrequency='([\d.]+)' numOctaves='(\d+)' stitchTiles='stitch'/g),
    ];
    expect(noise.length).toBe(3);
    for (const [, freq, octaves] of noise) {
      expect(freq).toBe("0.9");
      expect(octaves).toBe("2");
    }
    // intensità della carta cotta nell'alpha del tile, non via opacity
    const slopes = [...css.matchAll(/feFuncA type='linear' slope='([\d.]+)'/g)].map((m) => m[1]);
    expect(slopes).toContain("0.02"); // giorno: velo ~2% (specifica §3)
    expect(slopes).toContain("0.012"); // notte: più quieta
    // il tile delle copertine resta a intensità piena (la sua opacity
    // resta sul velo, come in V2-01: 5% giorno / 7% notte via token)
    const coverTile = css.match(/--grain-tile: url\("([^"]+)"\)/)?.[1] ?? "";
    expect(coverTile).not.toContain("feFuncA");
    expect(css).toContain("--grain-alpha-cover: 0.05");
    expect(css).toMatch(/\.dark \{[\s\S]*?--grain-alpha-cover: 0\.07/);
    // notte: blend screen esplicito (come le copertine), non inversione
    expect(css).toMatch(/\.dark \{[\s\S]*?--grain-blend: screen/);
  });

  it("il velo non tocca mai l'opacità del contenitore e si spegne su richiesta", () => {
    const rule = css.match(/\.paper-grain \{[\s\S]*?\}/)?.[0] ?? "";
    expect(rule).toContain("background-image: var(--grain-paper-tile)");
    expect(rule).toContain("background-size: var(--grain-scale)");
    expect(rule).toContain("background-blend-mode: var(--grain-blend)");
    expect(rule).not.toMatch(/(^|[^-])opacity\s*:/); // niente opacity al contenitore
    expect(rule).not.toContain("animation"); // mai grana animata
    // chi chiede superfici piatte ottiene superfici piatte
    expect(css).toMatch(
      /prefers-reduced-transparency: reduce[\s\S]*?\.paper-grain[\s\S]*?background-image: none/,
    );
    expect(css).toMatch(/html\.high-contrast \.paper-grain \{[\s\S]*?background-image: none/);
  });

  it("il fondo grana solo sulla Home: gate isHome sul contenitore dello scroll", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    expect(layout).toContain('isHome && "paper-grain"');
  });

  it("copre fondo e superfici carta della Home, non la navigazione", () => {
    const timeline = read("src/components/home/DailyTimeline.tsx");
    expect(timeline.match(/paper-grain/g)?.length).toBe(2); // vuota + piano del giorno
    expect(read("src/components/home/QuickToolsGrid.tsx")).toContain("paper-grain");
    expect(read("src/components/home/HomeView.tsx")).toContain("paper-grain"); // card errore
    expect(read("src/components/home/HomeDashboardSkeleton.tsx")).toContain("paper-grain");
    // il dock è navigazione: resta liscio
    expect(read("src/components/layout/BottomNav.tsx")).not.toContain("paper-grain");
  });

  it("niente doppia grana: la copertina attiva non riceve anche la grana dei fogli", () => {
    const hero = read("src/components/home/CourseHeroCard.tsx");
    // stato vuoto = carta di accoglienza → grana; stato attivo = copertina
    // con la SUA grana (cover-grain): mai le due sovrapposte
    expect(hero).toContain("paper-grain");
    expect(hero).not.toMatch(/relative w-full overflow-hidden rounded-hero[^\n]*paper-grain/);
    expect(hero).toContain("btn-satin"); // il satinato del CTA resta quello
    const bg = read("src/components/studio/CourseCardBackground.tsx");
    expect(bg).toContain("cover-grain");
    expect(bg).not.toContain("paper-grain");
  });

  it("resta confinata alla Home: Studio, lezioni, Piano e Core non la attivano", () => {
    const dirs = [
      "src/components/studio",
      "src/components/piano",
      "src/components/core",
      "src/components/upload",
      "src/components/pratica",
      "src/components/chat",
      "src/components/focus",
    ];
    for (const dir of dirs) {
      expect(fs.existsSync(path.join(root, dir)), `${dir} deve esistere`).toBe(true);
      const files = fs.readdirSync(path.join(root, dir), { recursive: true }) as string[];
      for (const f of files.filter((x) => x.endsWith(".tsx") || x.endsWith(".ts"))) {
        const content = fs.readFileSync(path.join(root, dir, f), "utf8");
        expect(content, `${dir}/${f} non deve attivare paper-grain`).not.toContain("paper-grain");
      }
    }
  });
});
