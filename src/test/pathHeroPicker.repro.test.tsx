import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("apre il selettore: appare Annulla subito, gli altri corsi dopo la centratura", async () => {
    render(<PathHero {...base} onSelectCourse={() => {}} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    expect(screen.getByText("Annulla")).toBeTruthy();
    // gli altri corsi compaiono DOPO la centratura (fase 2)
    await waitFor(() => expect(screen.getByText("Scegli corso")).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByText("matematica")).toBeTruthy();
  });

  it("forza i titoli di tutte le card corso al bianco anche nel tema chiaro", async () => {
    render(<PathHero {...base} onSelectCourse={() => {}} />);
    expect(screen.getByRole("heading", { name: "Storia" })).toHaveClass("text-white");

    fireEvent.click(screen.getByText("Cambia corso"));
    const otherCourseTitle = await screen.findByRole("heading", { name: "matematica" });
    expect(otherCourseTitle).toHaveClass("text-white");
  });

  it("notifica al genitore l'apertura/chiusura del selettore", () => {
    const onChange = vi.fn();
    render(<PathHero {...base} onSelectCourse={() => {}} onSelectingChange={onChange} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    expect(onChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText("Annulla"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("cliccando un corso chiama onSelectCourse con il suo id e chiude", async () => {
    const onSelect = vi.fn();
    render(<PathHero {...base} onSelectCourse={onSelect} />);
    fireEvent.click(screen.getByText("Cambia corso"));
    await waitFor(() => expect(screen.getByText("matematica")).toBeTruthy(), { timeout: 2000 });
    fireEvent.click(screen.getByText("matematica"));
    expect(onSelect).toHaveBeenCalledWith("2");
    // il selettore si chiude: "Cambia corso" torna visibile
    await waitFor(() => expect(screen.getByText("Cambia corso")).toBeTruthy(), { timeout: 2000 });
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
