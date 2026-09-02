import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModulesOverview } from "@/components/studio/ModulesOverview";
import { ModulePath } from "@/components/studio/ModulePath";

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
