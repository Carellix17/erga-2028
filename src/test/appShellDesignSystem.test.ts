import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * Guardrail del guscio applicativo — DESIGN.md v4.0 «Swiss Cognitive Grid +
 * Tactile Studio»: celle a raggio 0, controlli 2px, pannelli al massimo 4px;
 * superfici piatte (nessuna ombra morbida) con ombra rigida 2px solo sulla CTA;
 * Ubuntu Sans per UI e corpo, Instrument Serif per la lettura editoriale,
 * Ubuntu Sans Mono per le misure.
 */
describe("design system v4 — app shell", () => {
  it("espone la geometria 0/2/4px prevista da DESIGN.md v4", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/index.css");

    // Le utility Tailwind restano agganciate alle variabili, non a valori fissi.
    expect(tailwind).toContain('xs: "var(--radius-xs)"');
    expect(tailwind).toContain('control: "var(--radius-control)"');
    expect(tailwind).toContain('card: "var(--radius-card)"');
    expect(tailwind).toContain('button: "var(--radius-button)"');
    expect(tailwind).toContain('nav: "var(--radius-nav)"');
    expect(tailwind).toContain('dialog: "var(--radius-dialog)"');
    expect(tailwind).toContain('none: "0px"');
    expect(tailwind).toContain('DEFAULT: "2px"');

    // Griglia continua: celle, card, hero, nav e sheet sono squadrati.
    expect(css).toContain("--radius-card: 0px");
    expect(css).toContain("--radius-hero: 0px");
    expect(css).toContain("--radius-nav: 0px");
    expect(css).toContain("--radius-sheet: 0px");
    // Controlli: 2px. Pannelli e dialoghi: al massimo 4px.
    expect(css).toContain("--radius-xs: 2px");
    expect(css).toContain("--radius-control: 2px");
    expect(css).toContain("--radius-button: 2px");
    expect(css).toContain("--radius-pill: 2px");
    expect(css).toContain("--radius-dialog: 4px");
    expect(css).toContain("--radius-lg: 4px");
    // I cerchi reali restano tali.
    expect(css).toContain("--radius-full: 9999px");

    // La geometria v3 (4/8/12px) non deve tornare.
    expect(css).not.toContain("--radius-control: 8px");
    expect(css).not.toContain("--radius-card: 12px");
    expect(css).not.toContain("--radius-hero: 12px");
    expect(css).not.toContain("--radius-button: 8px");
    expect(css).not.toContain("--radius-hero: 32px");
    expect(css).not.toContain("--radius-button: 16px");
  });

  it("usa AppLayout e la firma vermiglia v4, senza le vecchie texture globali", () => {
    const index = read("src/pages/Index.tsx");
    const layout = read("src/components/layout/AppLayout.tsx");
    const css = read("src/index.css");

    expect(index).toContain("<AppLayout");
    expect(index).not.toContain("dot-halo-scope");
    expect(index).not.toContain("<BottomNav");
    expect(layout).toContain('className="erga-earthy-stripe"');
    expect(css).toContain(".erga-earthy-stripe {");
    // v4: il vecchio gradiente diventa una linea decorativa vermiglia di 2px.
    expect(css).toMatch(
      /\.erga-earthy-stripe \{ background: var\(--accent-primary\); height: 2px; flex-basis: 2px; \}/,
    );
    expect(layout).not.toContain("bg-dot-grid");
    expect(css).not.toContain("P26 — MARGINE AMBIENTE");
    expect(css).not.toContain("@keyframes ambient-margin-drift");
  });

  it("lega card, bottoni e input ai token semantici v4", () => {
    const card = read("src/components/ui/card.tsx");
    const button = read("src/components/ui/button.tsx");
    const input = read("src/components/ui/input.tsx");

    // Celle piatte e squadrate, bordo di griglia, nessuna ombra morbida.
    expect(card).toContain("rounded-none border shadow-none");
    expect(card).toContain("bg-card text-card-foreground border-border");
    // Controlli: raggio 2px e confine inchiostro.
    expect(button).toContain("rounded-button");
    expect(button).toContain("bg-primary text-primary-foreground");
    expect(input).toContain("rounded-control");
    expect(input).toContain("border-[#11120D]");
    expect(input).toContain("bg-[#FFFDF9]");
  });

  it("mantiene la CTA primaria vermiglia, con ombra rigida 2px e raggio 2px", () => {
    const button = read("src/components/ui/button.tsx");
    const css = read("src/index.css");

    expect(button).toMatch(/default:\s*"border border-\[#11120D\] bg-primary text-primary-foreground/);
    expect(button).toContain("shadow-[2px_2px_0px_#11120D]");
    // La pressione riduce lo stacco: l'ombra rigida sparisce e il controllo si sposta di 1px.
    expect(button).toContain("active:translate-x-px active:translate-y-px active:shadow-none");
    expect(button).toContain("hover:bg-primary-deep");
    expect(button).not.toMatch(/default:\s*"[^"]*rounded-pill/);

    // #C82F0A su testo #FFFDF9 (circa 5,35:1 → AA per testo normale).
    expect(css).toContain("--primary: 11.6842 90.4762% 41.1765%");
    expect(css).toContain("--primary-deep: 11.2727 92.1788% 35.0980%");
    expect(css).toContain("--primary-foreground: var(--accent-light)");
    // Superfici piatte: le ombre di sistema sono spente.
    expect(css).toContain("--shadow-level-3: none");
    expect(css).toContain("--shadow-hero-card: none");
  });

  it("nav mobile: dock da 64px con safe area e quattro destinazioni", () => {
    const nav = read("src/components/layout/BottomNav.tsx");

    expect(nav).not.toContain("from-black");
    expect(nav).not.toContain("bg-gradient-to-t");
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(nav).toContain("rounded-nav");
    expect(nav).toContain("h-16");
    expect(nav).toContain("grid-cols-4");
    expect(nav).toContain("stiffness: 400, damping: 30");
    expect(nav).toContain('{ id: "core" as Tab, i18nKey: "nav.core"');
    expect(nav).toContain("aria-current");
    expect(nav).not.toContain("layoutId=");
  });

  it("mantiene la rail tablet e la sidebar desktop senza cambiare la navigazione", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("md:flex md:h-full md:w-[84px]");
    expect(nav).toContain("lg:w-64");
    expect(nav).not.toContain("xl:w-64");
  });

  it("definisce le superfici giorno e notte dai token ufficiali v4", () => {
    const css = read("src/index.css");

    // Giorno: canvas pietra, celle calde, foglio di lettura, inchiostro pieno.
    expect(css).toContain("--canvas: 45.0000 26.6667% 94.1176%"); // #F4F2EC
    expect(css).toContain("--surface-primary: 42.8571 41.1765% 96.6667%"); // #FAF8F3
    expect(css).toContain("--surface-secondary: 42.8571 25.0000% 89.0196%"); // #EAE6DC
    expect(css).toContain("--paper: 40.0000 100.0000% 98.8235%"); // #FFFDF9
    expect(css).toContain("--ink: 72.0000 16.1290% 6.0784%"); // #11120D
    expect(css).toContain("--line: 43.3333 18.0000% 80.3922%"); // #D6D1C4
    expect(css).toContain("--control-line: 72.0000 16.1290% 6.0784%");
    // Colore cognitivo per dati, progressi ed enfasi didattica.
    expect(css).toContain("--cognitive: 195.4545 53.2258% 24.3137%"); // #1D4E5F

    // Notte: canvas #0A0A08, superfici #1A1A15 / #262623, testo #FFFBF4.
    expect(css).toContain("--canvas: 60 11.11% 3.53%");
    expect(css).toContain("--surface-primary: 60 10.64% 9.22%");
    expect(css).toContain("--surface-secondary: 60 3.85% 14.31%");
    expect(css).toContain("--ink: 38.18 100% 97.84%");
    expect(css).toContain("--line: 50 11.54% 20.39%");

    // Alias esadecimali condivisi della griglia svizzera.
    expect(css).toContain("--bg-canvas: #F4F2EC");
    expect(css).toContain("--bg-surface: #FAF8F3");
    expect(css).toContain("--bg-sheet: #FFFDF9");
    expect(css).toContain("--border-grid: #D6D1C4");
    expect(css).toContain("--accent-primary: #E63B11");
    expect(css).toContain("--accent-cognitive: #1D4E5F");

    // I token v3 (canvas inchiostro di giorno) non devono tornare.
    expect(css).not.toContain("--canvas: 72 16.13% 6.08%");
    expect(css).not.toContain("--surface-primary: 50.77 8.18% 31.18%");
  });

  it("usa Ubuntu Sans per UI e corpo, Instrument Serif per la lettura, Ubuntu Sans Mono per le misure", () => {
    const tailwind = read("tailwind.config.ts");
    const html = read("index.html");

    expect(tailwind).toContain('sans: ["Ubuntu Sans", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('display: ["Ubuntu Sans", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('reading: ["Ubuntu Sans", "system-ui", "sans-serif"]');
    expect(tailwind).toContain('editorial: ["Instrument Serif", "Georgia", "serif"]');
    expect(tailwind).toContain('mono: ["Ubuntu Sans Mono", "ui-monospace", "monospace"]');

    expect(html).toContain("family=Ubuntu+Sans");
    expect(html).toContain("family=Ubuntu+Sans+Mono");
    expect(html).toContain("family=Instrument+Serif");
    expect(html).toContain("display=swap");

    // Le famiglie v3 non devono rientrare né nell'HTML né nei token.
    expect(html).not.toContain("Playfair+Display");
    expect(html).not.toContain("family=Inter");
    expect(html).not.toContain("family=Lora");
    expect(html).not.toContain("Montserrat");
    expect(tailwind).not.toContain("Playfair Display");
    expect(tailwind).not.toContain('"Inter"');
  });
});
