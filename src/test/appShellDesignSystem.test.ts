import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * App shell del pilota V2-01 (DESIGN.md 2.1 «Carta contemporanea»).
 * Le prescrizioni D1/D2 (raggio 0, dock rettangolare, ottanio, aura dei
 * blocchi) sono archiviate: questi controlli difendono la veste 2.1.
 */

describe("app shell design system", () => {
  it("espone radius semantici con la gerarchia 8/16/24/32 e pillola per le azioni (2.1 §6)", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/index.css");
    expect(tailwind).toContain('card: "var(--radius-card)"');
    expect(tailwind).toContain('button: "var(--radius-button)"');
    expect(tailwind).toContain('pill: "var(--radius-pill)"');
    expect(tailwind).toContain('hero: "var(--radius-hero)"');
    expect(tailwind).toContain('nav: "var(--radius-nav)"');
    // DESIGN.md 2.1 §6: 8 dettagli, 16 controlli, 24 card e dock,
    // 32 fogli protagonisti e sheet, pillola per le azioni.
    expect(css).toContain("--radius-sm: 8px");
    expect(css).toContain("--radius-md: 16px");
    expect(css).toContain("--radius-card: 24px");
    expect(css).toContain("--radius-hero: 32px");
    expect(css).toContain("--radius-nav: 24px");
    expect(css).toContain("--radius-dialog: 32px");
    expect(css).toContain("--radius-button: 16px");
    expect(css).toContain("--radius-pill: 999px");
    expect(css).toContain("--radius-full: 9999px");
    // niente raggio zero residuo
    expect(css).not.toContain(": 0px;");
  });

  it("usa AppLayout e non riporta le vecchie texture globali (aura, matrice di puntini)", () => {
    const index = read("src/pages/Index.tsx");
    expect(index).toContain("<AppLayout");
    expect(index).not.toContain("dot-halo-scope");
    expect(index).not.toContain("<BottomNav");
    // Il tavolo non torna alla vecchia matrice di puntini né agli aloni.
    // Dal V2-02 il fondo della Home porta la grana della carta, ma come
    // background-image tokenizzato e gate isHome (vedi paperGrain.test.ts):
    // qui si difende la morte delle texture GLOBALI di vecchia generazione.
    const layout = read("src/components/layout/AppLayout.tsx");
    expect(layout).not.toContain("bg-dot-grid");
  });

  it("mantiene i componenti base legati ai token del tema", () => {
    const card = read("src/components/ui/card.tsx");
    const button = read("src/components/ui/button.tsx");
    const input = read("src/components/ui/input.tsx");
    expect(card).toContain("rounded-card");
    expect(card).toContain("bg-card");
    expect(card).not.toContain("from-white");
    expect(button).toContain("rounded-button");
    expect(button).toContain("bg-primary text-primary-foreground");
    expect(input).toContain("rounded-button");
    expect(input).toContain("bg-card");
  });

  it("l'azione primaria è inchiostro a pillola (2.1 §4/§6)", () => {
    const button = read("src/components/ui/button.tsx");
    expect(button).toMatch(/default:\s*\n\s*"rounded-pill bg-primary/);
    const css = read("src/index.css");
    // inchiostro #252623 di giorno, carta chiara #F4F1E7 di notte
    expect(css).toContain("--primary: 80 4% 14%");
    expect(css).toMatch(/\.dark \{[\s\S]*?--primary: 46 37% 93%/);
  });

  it("V2-01: navigazione mobile = dock flottante ARROTONDATO, opaco, selezione inchiostro", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    // dock opaco: niente aloni a gradiente sopra la barra
    expect(nav).not.toContain("from-black");
    expect(nav).not.toContain("bg-gradient-to-t");
    // safe area riservata e dock arrotondato (radius-nav 24, 2.1 §10)
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(nav).toContain("rounded-nav");
    // Core è una voce del dock come le altre
    expect(nav).toContain('{ id: "core" as Tab, i18nKey: "nav.core"');
    // selezione = inchiostro, senza barrette d'accento (2.1 §10)
    expect(nav).not.toContain("bg-brand");
    expect(nav).toContain("aria-current");
    expect(nav).toContain('isActive ? "font-semibold text-foreground"');
    // etichette persistenti su ogni voce
    expect(nav).not.toContain('aria-label={t("nav.core")}');
  });

  it("V2-01: sidebar da 1024px e rail 768–1023 (soglie §10, decisione del pilota)", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("md:flex md:h-full md:w-[84px]");
    expect(nav).toContain("lg:w-64");
    expect(nav).not.toContain("xl:w-64");
  });

  it("in dark mode usa il tavolo notte #22211F e la carta #2D2C29 (2.1 §3)", () => {
    const css = read("src/index.css");
    expect(css).toContain("--background: 40 5% 13%");
    expect(css).toContain("--card: 40 5% 17%");
    expect(css).toContain("--border: 40 6% 28%");
    expect(css).toContain("--input: 39 7% 54%");
  });

  it("in light mode usa il tavolo avorio #F6F3EB e l'inchiostro #252623 (2.1 §3)", () => {
    const css = read("src/index.css");
    const tailwind = read("tailwind.config.ts");
    expect(css).toContain("--background: 44 38% 94%");
    expect(css).toContain("--ink: 80 4% 14%");
    expect(css).toContain("--card: 50 100% 99%");
    expect(css).toContain("--border: 50 15% 85%");
    // marca e selezione = inchiostro, non più ottanio (2.1 §4)
    expect(css).not.toContain("087F83");
    expect(css).not.toContain("8ECFD0");
    expect(css).toContain("--brand-deep: 80 4% 14%");
    expect(tailwind).toContain('ink: "hsl(var(--ink) / <alpha-value>)"');
  });

  it("il sistema aura/margine ambiente è stato rimosso (macchie sfumate: mai più)", () => {
    const css = read("src/index.css");
    expect(css).not.toContain("P26 — MARGINE AMBIENTE");
    expect(css).not.toContain("P27 — AURA ANIMATA");
    expect(css).not.toContain("@keyframes ambient-margin-drift");
    expect(css).not.toContain("--aura-void");
    expect(css).not.toContain("--ambient-block-ink");
    // la pagina banco-di-prova dell'aura non esiste più
    const app = read("src/App.tsx");
    expect(app).not.toContain("AuraLab");
    expect(app).not.toContain("/aura-lab");
  });

  it("tipografia: Lora per i titoli serif, Inter per interfaccia e lettura (2.1 §5)", () => {
    const tailwind = read("tailwind.config.ts");
    const html = read("index.html");
    expect(tailwind).toContain("display: ['Lora', 'Georgia', 'serif']");
    expect(tailwind).toContain("sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']");
    expect(tailwind).toContain("reading: ['Inter', 'system-ui', '-apple-system', 'sans-serif']");
    expect(html).toContain("family=Lora");
    expect(html).toContain("family=Inter");
    // Ubuntu Sans e Montserrat non sono più ruoli del prodotto
    expect(html).not.toContain("Ubuntu+Sans");
    expect(html).not.toContain("Montserrat");
    expect(tailwind).not.toContain("welcome-title");
  });
});
