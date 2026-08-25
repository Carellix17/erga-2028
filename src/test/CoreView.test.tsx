import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CoreView } from "@/components/core/CoreView";

// jsdom non ha ResizeObserver (usato dai cursori Radix): stub minimale.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const openDiagnostic = vi.fn();
const updateInterests = vi.fn();

// Profilo stabile: stesso riferimento a ogni render, come l'hook reale.
const cognitiveProfile = {
  nome: "Vale",
  eta: 16,
  istituto: null,
  log_score: 70,
  mem_score: 60,
  foc_score: 80,
  voc_score: 55,
  ans_score: 40,
  app_score: 65,
};

vi.mock("@/hooks/useCognitiveProfile", () => ({
  useCognitiveProfile: () => ({
    profile: cognitiveProfile,
    hasCompletedOnboarding: true,
    isLoaded: true,
    refresh: vi.fn(),
    save: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useUserSubjects", () => ({
  useUserSubjects: () => ({ data: [], isLoading: false }),
  useAddUserSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUserSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSubjectColor: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useUserRoutines", () => ({
  useUserRoutines: () => ({ data: [], isLoading: false }),
  useAddUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useUserData", () => ({
  useUserData: () => ({ data: [], updateData: updateInterests, isLoaded: true }),
}));

// Radar recharts: sostituito per non dipendere dalle misure del viewport in jsdom.
vi.mock("@/components/core/CognitiveRadar", () => ({
  CognitiveRadar: () => <div data-testid="cognitive-radar" />,
}));

function renderCore() {
  return render(
    <MemoryRouter>
      <CoreView onOpenCognitive={openDiagnostic} />
    </MemoryRouter>,
  );
}

/**
 * Radix Tabs si attiva su `mousedown` (pulsante sinistro, senza Ctrl),
 * non su `click`: i test devono premere il tasto come fa davvero il browser.
 */
function clickTab(name: string | RegExp) {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  return tab;
}

/** La scheda CoreCard che contiene un certo titolo. */
function materialOf(title: string): string {
  const heading = screen.getByRole("heading", { name: title });
  const section = heading.closest("section");
  expect(section, `nessuna scheda attorno a "${title}"`).not.toBeNull();
  return (section as HTMLElement).className;
}

describe("CoreView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra l'intestazione della pagina", () => {
    renderCore();
    expect(screen.getByRole("heading", { level: 1, name: "Core" })).toBeInTheDocument();
    expect(screen.getByText("Chi sei, come studi, quando sei libero.")).toBeInTheDocument();
  });

  it("mostra le tre sezioni del Core e nessuna impostazione account", () => {
    renderCore();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Esagono Cognitivo" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Materie & Interessi" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Planning Routine" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /account/i })).not.toBeInTheDocument();
  });

  it("parte dalla scheda Esagono con i valori del profilo", () => {
    renderCore();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Esagono Cognitivo");
    expect(screen.getByTestId("cognitive-radar")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument(); // Focus
  });

  it("mostra una sola scheda alla volta (pagina più corta)", () => {
    renderCore();
    // Routine non è montata finché la sua scheda non è attiva.
    expect(screen.queryByText("Nessuna attività programmata.")).not.toBeInTheDocument();
    clickTab("Planning Routine");
    expect(screen.getByText("Nessuna attività programmata.")).toBeInTheDocument();
    // ...e l'Esagono esce dal documento.
    expect(screen.queryByTestId("cognitive-radar")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("non permette di modificare a mano i punteggi: solo rifare il test", () => {
    renderCore();
    expect(screen.queryByRole("button", { name: /Aggiusta parametri/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Salva parametri/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rifai il test/i })).toBeInTheDocument();
  });

  it("il pulsante diagnostico apre il questionario", () => {
    renderCore();
    fireEvent.click(screen.getByRole("button", { name: /Rifai il test/i }));
    expect(openDiagnostic).toHaveBeenCalledTimes(1);
  });

  it("nella scheda Materie aggiunge un interesse e mostra i vuoti guidati", () => {
    renderCore();
    clickTab("Materie & Interessi");
    expect(screen.getByText(/Nessuna materia aggiunta/i)).toBeInTheDocument();

    const input = screen.getByLabelText("Aggiungi interesse");
    fireEvent.change(input, { target: { value: "Scacchi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(updateInterests).toHaveBeenCalledWith(["Scacchi"]);
  });

  it("i tag materie e interessi usano Badge con una piccola x di rimozione", () => {
    renderCore();
    clickTab("Materie & Interessi");
    // Il tag viene creato solo dopo l'aggiunta: verifichiamo il markup generato
    // dal componente Badge (pillola + bordo) leggendo la sorgente condivisa.
    const src = read("src/components/core/SubjectsInterestsEditor.tsx");
    expect(src).toContain('from "@/components/ui/badge"');
    expect(src).toMatch(/<Badge variant="secondary"/);
    // Icona di rimozione piccola, non il vecchio cestino ingombrante.
    expect(src).toMatch(/<X className="h-3\.5 w-3\.5"/);
    expect(src).not.toContain("Trash2");
  });

  it("nella scheda Routine mostra lo stato vuoto guidato", () => {
    renderCore();
    clickTab("Planning Routine");
    expect(screen.getByText("Nessuna attività programmata.")).toBeInTheDocument();
    expect(
      screen.getByText(/Aggiungi i tuoi orari di sport o pasti per ottimizzare lo studio/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aggiungi blocco/i })).toBeInTheDocument();
  });

  it("le tre sezioni condividono lo stesso materiale di scheda", () => {
    renderCore();
    const materials = [materialOf("Esagono Cognitivo")];

    clickTab("Materie & Interessi");
    materials.push(materialOf("Materie preferite"));

    clickTab("Planning Routine");
    materials.push(materialOf("Settimana"));

    // Stessa identica stringa di classi → stesso bordo, ombra, fondo e angoli.
    expect(new Set(materials).size).toBe(1);
    expect(materials[0]).toContain("rounded-card");
    expect(materials[0]).toContain("bg-card");
    expect(materials[0]).toContain("border-border");
    expect(materials[0]).toContain("shadow-level-1");
  });

  it("nessuna impostazione di account dentro il Core", () => {
    renderCore();
    for (const tab of ["Materie & Interessi", "Planning Routine"]) {
      clickTab(tab);
    }
    clickTab("Esagono Cognitivo");
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cambia password/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Esci dall'account/i })).not.toBeInTheDocument();
  });

  it("cambia scheda anche da tastiera (frecce)", async () => {
    renderCore();
    const esagono = screen.getByRole("tab", { name: "Esagono Cognitivo" });
    esagono.focus();
    fireEvent.keyDown(esagono, { key: "ArrowRight" });
    // Radix sposta il focus con un setTimeout: aspettiamo il suo turno.
    await screen.findByRole("tab", { name: "Materie & Interessi", selected: true });
    // ...e il contenuto segue la scheda.
    expect(await screen.findByText(/Nessuna materia aggiunta/i)).toBeInTheDocument();
  });
});

describe("Core — barra delle schede senza scrollbar", () => {
  it("usa una classe di hiding che esiste davvero nel CSS", () => {
    const css = read("src/index.css");
    const view = read("src/components/core/CoreView.tsx");

    const usate = [...new Set([...view.matchAll(/scrollbar-[a-z]+/g)].map((m) => m[0]))];
    expect(usate.length).toBeGreaterThan(0);
    for (const classe of usate) {
      // Il bug originale: CoreView usava `scrollbar-none`, mai definita → scrollbar visibile.
      expect(css, `la classe .${classe} non è definita in src/index.css`).toContain(`.${classe}`);
    }
    expect(css).toMatch(/\.scrollbar-hide\s*\{[^}]*scrollbar-width:\s*none/);
    expect(css).toMatch(/\.scrollbar-hide::-webkit-scrollbar\s*\{\s*display:\s*none/);
  });

  it("la tablist nasconde lo scrollbar e resta navigabile", () => {
    renderCore();
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("scrollbar-hide");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).not.toContain("scrollbar-none");
  });
});
