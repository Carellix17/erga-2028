import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CourseSelector } from "@/components/studio/CourseSelector";

/**
 * Test di regressione: il componente deve rispettare le regole degli hook
 * qualunque sia il numero di corsi (anche durante i caricamenti, quando
 * l'elenco passa da vuoto a pieno e viceversa).
 */

const oneCourse = [{ id: "1", file_name: "storia.pdf" }];
const noCourses: { id: string; file_name: string }[] = [];

describe("CourseSelector", () => {
  it("non disegna nulla quando non ci sono corsi", () => {
    const { container } = render(
      <CourseSelector courses={noCourses} activeContextId={null} onSelectCourse={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("mostra il nome del corso attivo", () => {
    render(
      <CourseSelector courses={oneCourse} activeContextId="1" onSelectCourse={() => {}} />,
    );
    expect(screen.getByText("storia")).toBeTruthy();
  });

  it("sopravvive al passaggio 0 -> N corsi (caricamento dati)", () => {
    const { rerender } = render(
      <CourseSelector courses={noCourses} activeContextId={null} onSelectCourse={() => {}} />,
    );
    rerender(
      <CourseSelector courses={oneCourse} activeContextId="1" onSelectCourse={() => {}} />,
    );
    expect(screen.getByText("storia")).toBeTruthy();
  });

  it("sopravvive al passaggio N -> 0 -> N corsi (elimina tutto, poi ricarica)", () => {
    const { rerender, container } = render(
      <CourseSelector courses={oneCourse} activeContextId="1" onSelectCourse={() => {}} />,
    );
    rerender(
      <CourseSelector courses={noCourses} activeContextId={null} onSelectCourse={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
    rerender(
      <CourseSelector courses={oneCourse} activeContextId="1" onSelectCourse={() => {}} />,
    );
    expect(screen.getByText("storia")).toBeTruthy();
  });

  it("cliccando un corso chiama onSelectCourse con il suo id", () => {
    const onSelect = vi.fn();
    render(
      <CourseSelector
        courses={[...oneCourse, { id: "2", file_name: "matematica.pdf" }]}
        activeContextId="1"
        onSelectCourse={onSelect}
      />,
    );
    // apri la finestra di selezione e scegli il secondo corso
    fireEvent.click(screen.getByText("storia"));
    fireEvent.click(screen.getByText("matematica"));
    expect(onSelect).toHaveBeenCalledWith("2");
  });
});
