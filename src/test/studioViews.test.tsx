import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonsList } from "@/components/studio/LessonsList";
import { LessonsListSkeleton } from "@/components/studio/LessonsListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModulesOverview } from "@/components/studio/ModulesOverview";
import { PracticeLaunchers, SubViewHeader } from "@/components/studio/StudioPractice";

/**
 * 🌿 P21b — Collaudo di accensione della schermata Studio in salotto
 * (il sentiero è diventato lista: i pezzi devono montarsi senza esplodere).
 */

const lessons = [
  { id: "l1", title: "Introduzione al tema", is_generated: true, lesson_order: 0 },
  { id: "l2", title: "Sviluppo del tema", is_generated: true, lesson_order: 1 },
  { id: "l3", title: "Approfondimento", is_generated: false, lesson_order: 2 },
];

describe("P21b pilota Studio — accensione", () => {
  it("LessonsList si monta e mostra la lista: completata, corrente, bloccata", () => {
    render(
      <LessonsList
        lessons={lessons}
        currentIndex={1}
        onSelectLesson={() => {}}
        onBack={() => {}}
        isGenerating={false}
      />,
    );
    // la completata
    expect(screen.getByText("Introduzione al tema")).toBeTruthy();
    expect(screen.getByText("Completata")).toBeTruthy();
    // la corrente: tondo-firma + invito
    expect(screen.getByText("Sviluppo del tema")).toBeTruthy();
    expect(screen.getByText("Pronta per te")).toBeTruthy();
    expect(screen.getByText("Riprendi")).toBeTruthy();
    // la bloccata
    expect(screen.getByText("Approfondimento")).toBeTruthy();
    expect(screen.getByText("Da sbloccare")).toBeTruthy();
    // il progresso
    expect(screen.getByText("33%")).toBeTruthy();
  });

  it("LessonsList col cancello del vagone: porta e chiuse si vedono", () => {
    render(
      <LessonsList
        lessons={lessons}
        currentIndex={0}
        onSelectLesson={() => {}}
        onBack={() => {}}
        isGenerating={false}
        gatedModuleIndex={0}
      />,
    );
    const badges = screen.getAllByText("In preparazione…");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("LessonsListSkeleton si monta col righello (count)", () => {
    const { container } = render(<LessonsListSkeleton count={6} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("EmptyState si monta e offre la pill-firma", () => {
    const onUpload = vi.fn();
    render(<EmptyState onUploadClick={onUpload} />);
    expect(screen.getByText("Inizia il tuo percorso")).toBeTruthy();
    expect(screen.getByText("Inizia ora")).toBeTruthy();
  });

  it("ModulesOverview mostra solo le schede dei moduli e notifica l'apertura", () => {
    // P37: Crea nuovo percorso e i tre accessi alla pratica vivono in StudioView
    const onOpenModule = vi.fn();
    render(
      <ModulesOverview
        modules={[
          { index: 0, title: "Modulo 1", doneCount: 1, total: 5, state: "cur" },
        ]}
        onOpenModule={onOpenModule}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Modulo 1/ }));
    expect(onOpenModule).toHaveBeenCalledWith(0);
  });

  it("ModulesOverview senza moduli non renderizza nulla", () => {
    const { container } = render(<ModulesOverview modules={[]} onOpenModule={() => {}} />);
    expect(container.firstElementChild).toBeNull();
  });
});

describe("StudioPractice (P37) — accessi dedicati e ritorno", () => {
  it("PracticeLaunchers espone tre pulsanti indipendenti con la destinazione giusta", () => {
    const onOpen = vi.fn();
    render(<PracticeLaunchers onOpen={onOpen} />);

    for (const [label, expected] of [
      ["Esercizi", "esercizi"],
      ["Interrogazione", "interrogazione"],
      ["Chat", "chat"],
    ] as const) {
      const btn = screen.getByRole("button", { name: `Apri ${label}` });
      expect(btn.className).toMatch(/min-h-\[76px\]/); // target touch generoso
      fireEvent.click(btn);
      expect(onOpen).toHaveBeenCalledWith(expected);
    }
    expect(onOpen).toHaveBeenCalledTimes(3);
  });

  it("SubViewHeader riporta a Studio e mostra il contesto del corso", () => {
    const onBack = vi.fn();
    render(
      <SubViewHeader title="Esercizi" courseTitle="Biologia" onBack={onBack} />,
    );
    expect(screen.getByText("Esercizi")).toBeTruthy();
    expect(screen.getByText("Biologia")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Torna a Studio" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
