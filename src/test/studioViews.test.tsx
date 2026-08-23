import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonsList } from "@/components/studio/LessonsList";
import { LessonsListSkeleton } from "@/components/studio/LessonsListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModulesOverview } from "@/components/studio/ModulesOverview";

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

  it("ModulesOverview mostra il pulsante 'Nuovo percorso di studio' e lo notifica", () => {
    const onCreatePath = vi.fn();
    render(
      <ModulesOverview
        modules={[
          { index: 0, title: "Modulo 1", doneCount: 1, total: 5, state: "cur" },
        ]}
        onOpenModule={() => {}}
        onCreatePath={onCreatePath}
      />,
    );
    const btn = screen.getByRole("button", { name: "Crea un nuovo percorso di studio" });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onCreatePath).toHaveBeenCalledTimes(1);
  });

  it("ModulesOverview mostra i blocchi di Pratica del percorso e chiama onOpenPratica con il tab corretto", () => {
    const onOpenPratica = vi.fn();
    render(
      <ModulesOverview
        modules={[
          { index: 0, title: "Modulo 1", doneCount: 1, total: 5, state: "cur" },
        ]}
        onOpenModule={() => {}}
        onOpenPratica={onOpenPratica}
      />,
    );

    expect(screen.getByText("Pratica del percorso")).toBeTruthy();
    expect(screen.getByText("Esercizi Mirati")).toBeTruthy();
    expect(screen.getByText("Interrogazione")).toBeTruthy();
    expect(screen.getByText("Chat col Tutor")).toBeTruthy();

    fireEvent.click(screen.getByText("Esercizi Mirati"));
    expect(onOpenPratica).toHaveBeenCalledWith("esercizi");

    fireEvent.click(screen.getByText("Interrogazione"));
    expect(onOpenPratica).toHaveBeenCalledWith("interrogazione");

    fireEvent.click(screen.getByText("Chat col Tutor"));
    expect(onOpenPratica).toHaveBeenCalledWith("chat");
  });

  it("ModulesOverview senza percorsi mostra comunque l'invito a crearne uno", () => {
    render(<ModulesOverview modules={[]} onOpenModule={() => {}} onCreatePath={() => {}} />);
    expect(screen.getByText("Nuovo percorso di studio")).toBeTruthy();
  });
});
