import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PathHero } from "@/components/studio/PathHero";

// 🛡️ P24 regressione: il selettore "Cambia corso" della Hero (morphing)
// deve aprire la lista dei corsi senza errori, selezionare e tornare indietro.
describe("PathHero — selettore percorsi (morphing)", () => {
  const courses = [
    { id: "1", file_name: "storia.pdf", lesson_count: 5 },
    { id: "2", file_name: "matematica.pdf", lesson_count: 8 },
  ];

  const base = {
    title: "Storia",
    completedCount: 1,
    totalLessons: 5,
    canResume: true,
    onResume: () => {},
    courses,
    activeCourseId: "1",
  };

  it("apre il selettore senza errori: appare Annulla e gli altri corsi", () => {
    render(<PathHero {...base} onSelectCourse={() => {}} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    expect(screen.getByText("Annulla")).toBeTruthy();
    expect(screen.getByText("matematica")).toBeTruthy();
  });

  it("cliccando un corso chiama onSelectCourse con il suo id e chiude", () => {
    const onSelect = vi.fn();
    render(<PathHero {...base} onSelectCourse={onSelect} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    fireEvent.click(screen.getByText("matematica"));
    expect(onSelect).toHaveBeenCalledWith("2");
    // il selettore si chiude: "Cambia corso" torna visibile
    expect(screen.getByText("Cambia corso")).toBeTruthy();
  });

  it("Annulla chiude il selettore senza selezionare", () => {
    const onSelect = vi.fn();
    render(<PathHero {...base} onSelectCourse={onSelect} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    fireEvent.click(screen.getByText("Annulla"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Cambia corso")).toBeTruthy();
  });

  it("con un solo corso il tasto Cambia corso non appare", () => {
    render(<PathHero {...base} courses={[courses[0]]} onSelectCourse={() => {}} />);
    expect(screen.queryByText("Cambia corso")).toBeNull();
  });
});
