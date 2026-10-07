import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { UnifiedPipelineLoader } from "@/components/upload/UnifiedPipelineLoader";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

/**
 * Difende le tre correzioni del 7 ottobre 2026:
 * 1. il doc di caricamento materiali mostra SEMPRE il tasto principale
 *    (catena flex integra, dvh, aggancio alla tastiera);
 * 2. le impostazioni sono route figlie di /app: entrare e uscire NON smonta
 *    l'app (niente «la pagina si ricarica»);
 * 3. (il velo del doc degli strumenti è difeso in studioViews.test.tsx)
 */

describe("Doc di caricamento materiali: il tasto principale si vede sempre", () => {
  it("il pannello «Caricamento» è un contenitore flex con min-h-0: la catena fino alla CTA non si rompe", () => {
    const sheet = read("src/components/upload/UploadSheet.tsx");
    // il pannello esterno deve essere flex column (prima era block: il Tabs
    // interno con h-full si dimensionava sul contenuto e sforava il foglio)
    expect(sheet).toContain('className="flex flex-1 flex-col min-h-0 mt-0 overflow-hidden tab-enter"');
    // niente h-full sul Tabs interno: con il genitore flex basta flex-1 + min-h-0
    expect(sheet).not.toContain("min-h-0 h-full overflow-hidden");
  });

  it("il foglio usa il viewport dinamico (dvh) e si aggancia alla tastiera", () => {
    const sheet = read("src/components/upload/UploadSheet.tsx");
    expect(sheet).toContain("max-h-[85dvh]");
    expect(sheet).not.toContain("max-h-[85vh]");
    // il foglio si alza sopra la tastiera e si restringe allo spazio visibile
    expect(sheet).toContain("useKeyboardInset()");
    expect(sheet).toMatch(/bottom: keyboard\.inset/);
    expect(sheet).toMatch(/maxHeight: keyboard\.viewportHeight/);
  });

  it("useKeyboardInset: senza visualViewport (desktop/jsdom) resta 0 e non fa nulla", () => {
    function Probe() {
      const kb = useKeyboardInset();
      return <p data-testid="kb">{`${kb.inset}|${kb.viewportHeight ?? "null"}`}</p>;
    }
    render(<Probe />);
    expect(screen.getByTestId("kb").textContent).toBe("0|null");
  });

  it("useKeyboardInset: con la tastiera aperta restituisce inset e altezza visibile", () => {
    // layout fisso 800px, viewport visivo 500px → inset 300, visibile 500
    Object.defineProperty(window, "visualViewport", {
      value: { height: 500, offsetTop: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", { value: 800, configurable: true });
    function Probe() {
      const kb = useKeyboardInset();
      return <p data-testid="kb2">{`${kb.inset}|${kb.viewportHeight ?? "null"}`}</p>;
    }
    render(<Probe />);
    expect(screen.getByTestId("kb2").textContent).toBe("300|500");
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
  });
});

describe("Pipeline unica del caricamento (decisione del proprietario, 7 ottobre 2026 — parte 1)", () => {
  it("i tre flussi (foto, documenti, web) passano tutti da runUnifiedPipeline", () => {
    const sheet = read("src/components/upload/UploadSheet.tsx");
    expect(sheet).toContain("const runUnifiedPipeline = async (opts: {");
    expect((sheet.match(/void runUnifiedPipeline\(/g) ?? []).length).toBe(3);
    // il caricamento unico è l'UNICA cosa nuova che si vede
    expect(sheet).toContain("<UnifiedPipelineLoader");
  });

  it("la compressione delle foto è silenziosa: niente spinner alla selezione", () => {
    const sheet = read("src/components/upload/UploadSheet.tsx");
    expect(sheet).not.toContain("Ottimizzo le foto");
    expect(sheet).not.toContain("setIsCompressing");
    // la coda silenziosa esiste e la pipeline la aspetta prima di caricare
    expect(sheet).toContain("compressQueueRef");
    expect(sheet).toMatch(/await compressQueueRef\.current/);
  });

  it("niente più «vai su Studio a generare»: la generazione parte da sé", () => {
    const sheet = read("src/components/upload/UploadSheet.tsx");
    expect(sheet).not.toContain("Vai su Studio per generare");
    expect(sheet).not.toContain("dal tab Studio");
    expect(sheet).not.toContain("Dopo il caricamento potrai generare");
    // la chiamata è la stessa del bottone «Genera percorso» di Studio
    expect(sheet).toContain("functions/v1/generate-lessons");
    expect(sheet).toContain("Percorso pronto! 🎉");
  });

  it("il loader è UNA schermata piena con UNA barra che non torna indietro", () => {
    const loader = read("src/components/upload/UnifiedPipelineLoader.tsx");
    expect(loader).toContain("fixed inset-0 z-[95]");
    expect(loader).toContain('role="status"');
    // il doc di Radix mette pointer-events:none sul body: senza auto qui,
    // il velo erediterebbe il none e il suo contenuto non sarebbe cliccabile
    expect(loader).toContain("pointer-events-auto fixed inset-0 z-[95]");
    // una sola barra, una sola didascalia per fase
    expect((loader.match(/rounded-pill bg-primary/g) ?? []).length).toBe(1);
    expect(loader).toContain("Preparo il tuo percorso");
    expect(loader).toContain("Continua in background");
    // il testo di fase cambia DENTRO la stessa schermata
    expect(loader).toContain("Carico il materiale…");
    expect(loader).toContain("Analizzo il contenuto…");
    expect(loader).toContain("Creo le lezioni…");
  });

  it("UnifiedPipelineLoader: renderizza barra e didascalia, il salta arriva dopo 15 secondi", async () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <UnifiedPipelineLoader phase="material" progress={10} courseName="La cellula" onSkip={() => {}} />,
    );
    expect(screen.getByText("Preparo il tuo percorso")).toBeTruthy();
    expect(screen.getByText("La cellula")).toBeTruthy();
    expect(screen.getByText("Carico il materiale…")).toBeTruthy();
    expect(screen.queryByText("Continua in background")).toBeNull(); // prima dei 15 secondi non c'è
    const bar = document.querySelector(".bg-primary");
    expect(bar).toBeTruthy();
    expect((bar as HTMLElement).style.width).toBe("10%");
    // cambio fase: STESSA schermata, altra didascalia, barra più avanti
    rerender(<UnifiedPipelineLoader phase="generation" progress={80} courseName="La cellula" onSkip={() => {}} />);
    expect(screen.getByText("Creo le lezioni…")).toBeTruthy();
    expect((bar as HTMLElement).style.width).toBe("80%");
    vi.advanceTimersByTime(15000);
    rerender(<UnifiedPipelineLoader phase="generation" progress={80} courseName="La cellula" onSkip={() => {}} />);
    expect(screen.getByText("Continua in background")).toBeTruthy(); // poi c'è
    vi.useRealTimers();
  });
});

describe("Impostazioni senza «ricaricata»: route figlie di /app", () => {
  it("App.tsx annida le impostazioni dentro /app (niente route separate)", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('<Route path="impostazioni" element={<SettingsIndex />} />');
    // le vecchie route top-level non devono tornare
    expect(app).not.toContain('path="/app/impostazioni"');
  });

  it("Index resta montato: renderizza l'Outlet sulle pagine impostazioni e ne ripristina lo scroll", () => {
    const index = read("src/pages/Index.tsx");
    expect(index).toContain("useLocation().pathname.startsWith(\"/app/impostazioni\")");
    expect(index).toContain("if (isSettingsRoute) return <Outlet />;");
    // memoria dello scroll continua + ripristino al ritorno
    expect(index).toContain("liveScrollRef");
    expect(index).toMatch(/setAppScrollTop\(scrollPositions\.current\[activeTab\]\)/);
  });
});
