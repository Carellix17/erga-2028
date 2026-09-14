import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ModulesOverview,
  MODULES_LAYER_ID,
  landingModuleIndex,
  completedBeforeLanding,
  type ModuleCardData,
} from "@/components/studio/ModulesOverview";
import { ModulePath } from "@/components/studio/ModulePath";

// 🧭 P46 — la posizione di scroll è finta: nei test non esiste un vero scorrimento,
// quindi la decidiamo noi e la schermata deve reagire di conseguenza.
const scrollState = vi.hoisted(() => ({ top: 0, toTop: 0, setCalls: [] as number[] }));
vi.mock("@/lib/appScroll", () => ({
  getAppScrollTop: () => scrollState.top,
  setAppScrollTop: (top: number) => { scrollState.setCalls.push(top); },
  appScrollToTop: () => { scrollState.toTop += 1; },
}));

// 🌲 P24 — collaudo del percorso a 2 livelli (moduli → lezioni).
describe("ModulesOverview — schermata dei moduli", () => {
  const base = [
    { index: 0, title: "La Rivoluzione Industriale", doneCount: 4, total: 4, state: "done" as const },
    { index: 1, title: "L'Ottocento", doneCount: 1, total: 4, state: "cur" as const },
    { index: 2, title: "Il Novecento", doneCount: 0, total: 4, state: "gen" as const, genPercent: 42 },
    { index: 3, title: "Il secondo dopoguerra", doneCount: 0, total: 4, state: "lock" as const },
  ];

  it("mostra i titoli interi e i badge di stato", () => {
    render(<ModulesOverview modules={base} onOpenModule={() => {}} />);
    expect(screen.getByText("La Rivoluzione Industriale")).toBeTruthy();
    expect(screen.getByText("Completato")).toBeTruthy();
    expect(screen.getByText("Riprendi")).toBeTruthy();
    expect(screen.getByText("In generazione")).toBeTruthy();
    expect(screen.getByText("Da sbloccare")).toBeTruthy();
  });

  it("i moduli bloccati non sono cliccabili", () => {
    const onOpen = vi.fn();
    render(<ModulesOverview modules={base} onOpenModule={onOpen} />);
    const locked = screen.getByText("Il secondo dopoguerra").closest("button");
    expect(locked?.getAttribute("disabled")).not.toBeNull();
  });

  it("cliccando un modulo attivo chiama onOpenModule con il suo indice", () => {
    const onOpen = vi.fn();
    render(<ModulesOverview modules={base} onOpenModule={onOpen} />);
    screen.getByText("L'Ottocento").closest("button")?.click();
    expect(onOpen).toHaveBeenCalledWith(1);
  });
});

describe("ModulePath — percorso squadrato delle lezioni", () => {
  const lessons = [
    { id: "l1", title: "L'Europa prima della Rivoluzione", is_generated: true, lesson_order: 0 },
    { id: "l2", title: "Macchine a vapore", is_generated: true, lesson_order: 1 },
    { id: "l3", title: "La nascita delle fabbriche", is_generated: true, lesson_order: 2 },
    { id: "l4", title: "Luddismo", is_generated: false, lesson_order: 3 },
  ];

  it("si monta e mostra il titolo del modulo e i titoli delle lezioni", () => {
    render(
      <ModulePath
        moduleIndex={0}
        moduleTitle="La Rivoluzione Industriale"
        lessons={lessons}
        currentIndex={1}
        isGeneratingLesson={false}
        isModuleGenerating={false}
        genCount={0}
        genTotal={4}
        onBack={() => {}}
        onModuleCompleted={() => {}}
        onSelectLesson={() => {}}
      />,
    );
    expect(screen.getByText("La Rivoluzione Industriale")).toBeTruthy();
    expect(screen.getByText("L'Europa prima della Rivoluzione")).toBeTruthy();
    // il nodo corrente ha l'etichetta "Riprendi" (nessuna scritta di stato)
    expect(screen.getByText("Riprendi")).toBeTruthy();
  });

  it("in generazione mostra il banner e non i nodi cliccabili", () => {
    render(
      <ModulePath
        moduleIndex={1}
        moduleTitle="Il Novecento"
        lessons={lessons}
        currentIndex={4}
        isGeneratingLesson={false}
        isModuleGenerating
        genCount={2}
        genTotal={4}
        onBack={() => {}}
        onModuleCompleted={() => {}}
        onSelectLesson={() => {}}
      />,
    );
    expect(screen.getByText("Sto generando le lezioni…")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("P38 con hideHeader nasconde la propria intestazione (la barra compatta la sostituisce)", () => {
    render(
      <ModulePath
        moduleIndex={0}
        moduleTitle="La Rivoluzione Industriale"
        lessons={lessons}
        currentIndex={1}
        isGeneratingLesson={false}
        isModuleGenerating={false}
        genCount={0}
        genTotal={4}
        onBack={() => {}}
        onModuleCompleted={() => {}}
        onSelectLesson={() => {}}
        hideHeader
      />,
    );
    expect(screen.queryByRole("button", { name: "Torna ai moduli" })).toBeNull();
    expect(screen.queryByText("La Rivoluzione Industriale")).toBeNull();
    // i nodi del percorso restano intatti
    expect(screen.getByText("L'Europa prima della Rivoluzione")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 🧭 P46 — FEATURE 1: la lista dei moduli che si apre da sola sul punto giusto
// ═══════════════════════════════════════════════════════════════════════
describe("P46 — lista moduli: atterraggio, sfumatura e pillola", () => {
  const corso3: ModuleCardData[] = [
    { index: 0, title: "La Rivoluzione Industriale", doneCount: 4, total: 4, state: "done" },
    { index: 1, title: "L'Ottocento", doneCount: 4, total: 4, state: "done" },
    { index: 2, title: "Il Novecento", doneCount: 1, total: 4, state: "cur" },
  ];
  const corsoNuovo: ModuleCardData[] = [
    { index: 0, title: "Si comincia", doneCount: 0, total: 4, state: "ready" },
    { index: 1, title: "Poi", doneCount: 0, total: 4, state: "lock" },
  ];
  const corsoFinito: ModuleCardData[] = [
    { index: 0, title: "Uno", doneCount: 4, total: 4, state: "done" },
    { index: 1, title: "Due", doneCount: 4, total: 4, state: "done" },
    { index: 2, title: "Tre", doneCount: 4, total: 4, state: "done" },
  ];

  /** Emula la card fissa di StudioView: uno strato vuoto dentro di lei. */
  let head: HTMLDivElement;
  let layer: HTMLDivElement;

  beforeEach(() => {
    scrollState.top = 0;
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    head = document.createElement("div");
    layer = document.createElement("div");
    layer.id = MODULES_LAYER_ID;
    head.appendChild(layer);
    document.body.appendChild(head);
  });

  afterEach(() => {
    head.remove();
    vi.restoreAllMocks();
  });

  it("corso appena iniziato: si atterra sul primo modulo e la pillola NON c'è", () => {
    expect(landingModuleIndex(corsoNuovo)).toBe(0);
    expect(completedBeforeLanding(corsoNuovo)).toBe(0);
    render(<ModulesOverview modules={corsoNuovo} onOpenModule={() => {}} />);
    fireEvent.scroll(window);
    expect(within(layer).queryByText(/moduli completati/)).toBeNull();
  });

  it("corso con 2 moduli completati: si atterra sul 3° e la pillola dice 2", () => {
    expect(landingModuleIndex(corso3)).toBe(2);
    expect(completedBeforeLanding(corso3)).toBe(2);
    render(<ModulesOverview modules={corso3} onOpenModule={() => {}} />);
    // le schede sono individuabili una per una (è così che la lista sa dove atterrare)
    expect(document.querySelector('[data-module-row="2"]')).toBeTruthy();
    // …e sotto la card fissa c'è la sfumatura d'uscita
    expect(layer.querySelector("[data-modules-fade]")).toBeTruthy();
  });

  it("la pillola compare scorrendo e sparisce tornando in cima", async () => {
    render(<ModulesOverview modules={corso3} onOpenModule={() => {}} />);
    // in cima: niente pillola
    expect(within(layer).queryByText("2 moduli completati")).toBeNull();

    scrollState.top = 640;
    fireEvent.scroll(window);
    const pill = await within(layer).findByText("2 moduli completati");
    expect(pill).toBeTruthy();
    expect(pill.closest("button")?.getAttribute("aria-label")).toBe("Torna in cima ai moduli");

    scrollState.top = 0;
    fireEvent.scroll(window);
    await waitFor(() => expect(within(layer).queryByText("2 moduli completati")).toBeNull());
  });

  it("corso tutto finito: si atterra sull'ultimo modulo, senza errori", () => {
    expect(landingModuleIndex(corsoFinito)).toBe(2);
    expect(landingModuleIndex([])).toBeNull();
    expect(completedBeforeLanding([])).toBe(0);
    render(<ModulesOverview modules={corsoFinito} onOpenModule={() => {}} />);
    expect(screen.getByText("Tre")).toBeTruthy();
  });

  it("cliccando la pillola si torna in cima", async () => {
    render(<ModulesOverview modules={corso3} onOpenModule={() => {}} />);
    scrollState.top = 640;
    fireEvent.scroll(window);
    const pill = await within(layer).findByText("2 moduli completati");
    const scrollSpy = window.scrollTo as unknown as ReturnType<typeof vi.fn>;
    scrollSpy.mockClear();
    const toTopBefore = scrollState.toTop;
    pill.closest("button")?.click();
    // o chiamiamo la finestra, o l'helper dell'app: l'importante è che NON resti fermo
    expect(scrollSpy.mock.calls.length + (scrollState.toTop - toTopBefore)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 🌀 P46 — FEATURE 2: il percorso serpentina (nodi tondi, titoli fuori)
// ═══════════════════════════════════════════════════════════════════════
describe("P46 — percorso serpentina", () => {
  const lessons = [
    { id: "l1", title: "L'Europa prima della Rivoluzione", is_generated: true, lesson_order: 0 },
    { id: "l2", title: "Macchine a vapore", is_generated: true, lesson_order: 1 },
    {
      id: "l3",
      title:
        "La nascita delle fabbriche e il lavoro degli operai nel primo Ottocento europeo raccontato bene",
      is_generated: false,
      lesson_order: 2,
    },
    { id: "l4", title: "Luddismo", is_generated: false, lesson_order: 3 },
  ];

  const renderPath = (currentIndex = 1) =>
    render(
      <ModulePath
        moduleIndex={0}
        moduleTitle="La Rivoluzione Industriale"
        lessons={lessons}
        currentIndex={currentIndex}
        isGeneratingLesson={false}
        isModuleGenerating={false}
        genCount={0}
        genTotal={4}
        onBack={() => {}}
        onModuleCompleted={() => {}}
        onSelectLesson={() => {}}
      />,
    );

  it("i nodi sono TONDI e il titolo sta nella scheda accanto, mai dentro il nodo", () => {
    renderPath();
    const node0 = document.querySelector('[data-lesson-node="0"]');
    expect(node0?.className).toContain("rounded-full");
    // lezione fatta: dentro il cerchio c'è solo la spunta, nessun titolo
    expect(node0?.querySelector("svg")).toBeTruthy();
    // lezione in corso: dentro il cerchio c'è solo il numero
    const node1 = document.querySelector('[data-lesson-node="1"]');
    expect(node1?.textContent).toContain("2");

    const label0 = document.querySelector('[data-lesson-label="0"]');
    expect(label0).toBeTruthy();
    expect(label0?.closest("[data-lesson-node]")).toBeNull(); // fuori dal nodo
    expect(label0?.textContent).toContain("Lezione 1");
    expect(label0?.textContent).toContain("L'Europa prima della Rivoluzione");
  });

  it("gli stati dei nodi restano distinti (fatto / in corso / bloccato)", () => {
    renderPath(1);
    expect(document.querySelector('[data-lesson-node="0"]')?.getAttribute("data-node-state")).toBe("done");
    expect(document.querySelector('[data-lesson-node="1"]')?.getAttribute("data-node-state")).toBe("cur");
    expect(document.querySelector('[data-lesson-node="2"]')?.getAttribute("data-node-state")).toBe("lock");
    expect(screen.getByText("Riprendi")).toBeTruthy(); // il nodo in corso ha la sua etichetta
  });

  it("la linea è una curva morbida: piena dove è fatto, tratteggiata nel futuro", () => {
    renderPath(1);
    const paths = Array.from(document.querySelectorAll("g.segs path"));
    expect(paths.length).toBe(4); // 3 tratti fra le lezioni + 1 verso il test finale
    expect(paths.every((p) => (p.getAttribute("d") || "").includes("C"))).toBe(true); // Bézier
    expect(document.querySelectorAll("g.segs path.seg-on").length).toBe(1); // primo tratto, fatto
    expect(document.querySelectorAll("g.segs path.seg-base[stroke-dasharray]").length).toBe(3);
  });

  it("i titoli lunghi restano nella loro scheda, che non tocca il nodo", () => {
    renderPath();
    const label2 = document.querySelector('[data-lesson-label="2"]');
    expect(label2?.textContent).toContain("raccontato bene");
    const node2 = document.querySelector('[data-lesson-node="2"]');
    // scheda e nodo sono due elementi separati: il testo non entra mai nel cerchio
    expect(node2?.textContent).not.toContain("fabbriche");
  });

  it("il tocco su un nodo continua ad aprire la lezione giusta", () => {
    const onSelect = vi.fn();
    render(
      <ModulePath
        moduleIndex={0}
        moduleTitle="La Rivoluzione Industriale"
        lessons={lessons}
        currentIndex={1}
        isGeneratingLesson={false}
        isModuleGenerating={false}
        genCount={0}
        genTotal={4}
        onBack={() => {}}
        onModuleCompleted={() => {}}
        onSelectLesson={onSelect}
      />,
    );
    document.querySelector<HTMLElement>('[data-lesson-node="0"]')?.click();
    expect(onSelect).toHaveBeenCalledWith(0);
  });
});
