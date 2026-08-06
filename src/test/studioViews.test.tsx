import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonsList } from "@/components/studio/LessonsList";
import { LessonsListSkeleton } from "@/components/studio/LessonsListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

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
});
