import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * V2-02/V2-02b — Grana della carta sulla Home (DESIGN.md 2.1 §3 «Grana»).
 *
 * Regole difese da questi controlli:
 *  · UNA sola sorgente di rumore (stesso feTurbulence delle copertine),
 *    asset inline locale e statico, senza giunte (stitchTiles);
 *  · DUE ruoli condivisi — tavolo (fondo avorio, più presente) e foglio
 *    (card carta, più delicato) — riusando stesso tile e stessa scala;
 *    le intensità sono relazioni dichiarate, non valori copiati: la
 *    calibrazione numerica vive nei token e nel registro;
 *  · il velo è SEMPRE un background-image: dipinto sotto testo e
 *    controlli, non intercetta click, assente dall'albero accessibile;
 *    nessun opacity sul contenitore con contenuto;
 *  · ambienza SOLO Home (gate isHome + componenti src/components/home),
 *    mai su Studio, lezioni, formule, campi, calendario, grafici, dock.
 */
describe("grana della carta (V2-02, calibrata V2-02b)", () => {
  const css = read("src/index.css");

  const tileUris = () =>
    [...css.matchAll(/--grain[a-z-]*tile: url\("([^"]+)"\)/g)].map((m) => m[1]);
  const slopes = () =>
    [...css.matchAll(/feFuncA type='linear' slope='([\d.]+)'/g)].map((m) => Number(m[1]));

  it("dichiara i token: texture locale unica, scala fissa, blend per tema", () => {
    expect(css).toContain("--grain-tile:");
    expect(css).toContain("--grain-table-tile:");
    expect(css).toContain("--grain-paper-tile:");
    expect(css).toContain("--grain-scale: 160px");
    expect(css).toContain("--grain-blend: multiply");
    // texture locale: data URI inline (l'unico "http" è il namespace SVG,
    // un identificatore, non una richiesta di rete)
    const tiles = tileUris();
    expect(tiles.length).toBe(5); // copertine + tavolo g/n + foglio g/n
    for (const uri of tiles) {
      expect(uri.startsWith("data:image/svg+xml")).toBe(true);
      expect(uri).toContain("xmlns='http://www.w3.org/2000/svg'");
    }
  });

  it("giorno e notte condividono lo stesso rumore, senza giunte", () => {
    const noise = [
      ...css.matchAll(/baseFrequency='([\d.]+)' numOctaves='(\d+)' stitchTiles='stitch'/g),
    ];
    expect(noise.length).toBe(5); // tutti i tile, stessa sorgente
    for (const [, freq, octaves] of noise) {
      expect(freq).toBe("0.9");
      expect(octaves).toBe("2");
    }
    // notte: blend screen esplicito (come le copertine), non inversione
    expect(css).toMatch(/\.dark \{[\s\S]*?--grain-blend: screen/);
    // le copertine non cambiano: intensità piena nel velo via opacity
    expect((css.match(/--grain-tile: url/g) ?? []).length).toBe(1);
    expect(css.match(/--grain-tile: url\("([^"]+)"\)/)?.[1] ?? "").not.toContain("feFuncA");
    expect(css).toContain("--grain-alpha-cover: 0.05");
    expect(css).toMatch(/\.dark \{[\s\S]*?--grain-alpha-cover: 0\.07/);
  });

  it("tavolo e foglio sono calibrati per ruolo e per tema (relazioni, non valori)", () => {
    // in ordine di apparizione: [giorno (:root), notte (.dark)]
    const tableSlopes = [
      ...css.matchAll(/--grain-table-tile: url\("data:[^"]*slope='([\d.]+)'/g),
    ].map((m) => Number(m[1]));
    const sheetSlopes = [
      ...css.matchAll(/--grain-paper-tile: url\("data:[^"]*slope='([\d.]+)'/g),
    ].map((m) => Number(m[1]));
    expect(tableSlopes.length).toBe(2);
    expect(sheetSlopes.length).toBe(2);
    const [tableDay, tableNight] = tableSlopes;
    const [sheetDay, sheetNight] = sheetSlopes;
    // tutti definiti e dentro una banda sana (niente velo impercettibile,
    // niente patina: 1%–6%)
    for (const s of [tableDay, sheetDay, tableNight, sheetNight]) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0.01);
      expect(s).toBeLessThanOrEqual(0.06);
    }
    // il tavolo è più presente dei fogli, in entrambi i temi
    expect(tableDay).toBeGreaterThan(sheetDay);
    expect(tableNight).toBeGreaterThan(sheetNight);
    // la notte è più quieta del giorno, per entrambi i ruoli
    expect(tableNight).toBeLessThan(tableDay);
    expect(sheetNight).toBeLessThan(sheetDay);
  });

  it("il velo non tocca mai l'opacità del contenitore e si spegne su richiesta", () => {
    for (const cls of ["paper-grain", "table-grain"]) {
      const rule = css.match(new RegExp(`\\.${cls} \\{[\\s\\S]*?\\}`))?.[0] ?? "";
      expect(rule).toContain("background-image: var(--grain-");
      expect(rule).toContain("background-size: var(--grain-scale)");
      expect(rule).toContain("background-blend-mode: var(--grain-blend)");
      expect(rule).not.toMatch(/(^|[^-])opacity\s*:/); // niente opacity al contenitore
      expect(rule).not.toContain("animation"); // mai grana animata
    }
    // chi chiede superfici piatte ottiene superfici piatte: entrambi i ruoli
    expect(css).toMatch(
      /prefers-reduced-transparency: reduce[\s\S]*?\.paper-grain[\s\S]*?\.table-grain[\s\S]*?background-image: none/,
    );
    expect(css).toMatch(
      /html\.high-contrast \.paper-grain,\s*html\.high-contrast \.table-grain \{[\s\S]*?background-image: none/,
    );
  });

  it("il fondo grana solo sulla Home: gate isHome sul contenitore dello scroll", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    expect(layout).toContain('isHome && "table-grain"');
  });

  it("copre tavolo e fogli della Home, non la navigazione", () => {
    const timeline = read("src/components/home/DailyTimeline.tsx");
    expect(timeline.match(/paper-grain/g)?.length).toBe(2); // vuota + piano del giorno
    expect(read("src/components/home/QuickToolsGrid.tsx")).toContain("paper-grain");
    expect(read("src/components/home/HomeView.tsx")).toContain("paper-grain"); // card errore
    expect(read("src/components/home/HomeDashboardSkeleton.tsx")).toContain("paper-grain");
    // il dock è navigazione: resta liscio (nessuno dei due ruoli)
    expect(read("src/components/layout/BottomNav.tsx")).not.toContain("paper-grain");
    expect(read("src/components/layout/BottomNav.tsx")).not.toContain("table-grain");
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
    expect(bg).not.toContain("table-grain");
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
        expect(content, `${dir}/${f} non deve attivare la grana`).not.toContain("paper-grain");
        expect(content, `${dir}/${f} non deve attivare la grana`).not.toContain("table-grain");
      }
    }
  });
});
