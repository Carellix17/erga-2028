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
    // P37: il pulsante primario della card percorso si chiama "Continua"
    expect(screen.getAllByText("Continua").length).toBeGreaterThan(0);
    // P39: "Cambia corso" non va MAI a capo, nemmeno su 360px
    expect(screen.getByText("Cambia corso").className).toMatch(/whitespace-nowrap/);
    fireEvent.click(screen.getByText("Cambia corso"));
    expect(screen.getByText("Annulla")).toBeTruthy();
    // gli altri corsi compaiono DOPO la centratura (fase 2)
    await waitFor(() => expect(screen.getByText("Scegli corso")).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByText("matematica")).toBeTruthy();
  });

  it("P28: marca le card corso per l'inchiostro a contrasto automatico", async () => {
    render(<PathHero {...base} onSelectCourse={() => {}} />);
    // Il colore del testo NON è più un token fisso (text-inverse-on-surface
    // diventava nero su fondo scuro nel tema scuro): lo script P28 misura il
    // fondo reale del blocco marcato data-auto-contrast e imposta
    // --contrast-ink; titoli e testi lo ereditano.
    const heroHeading = screen.getByRole("heading", { name: "Storia" });
    expect(heroHeading).not.toHaveClass("text-white");
    expect(heroHeading.closest("[data-auto-contrast]")).not.toBeNull();

    fireEvent.click(screen.getByText("Cambia corso"));
    const otherCourseTitle = await screen.findByRole("heading", { name: "matematica" });
    expect(otherCourseTitle).not.toHaveClass("text-white");
    expect(otherCourseTitle.closest("[data-auto-contrast]")).not.toBeNull();
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

  it("P38 variante 'resume': UN solo pulsante primario 'Riprendi lezione', niente Cambia corso né Continua", () => {
    const onResume = vi.fn();
    render(<PathHero {...base} variant="resume" onResume={onResume} onSelectCourse={() => {}} />);
    const btn = screen.getByRole("button", { name: "Riprendi lezione" });
    fireEvent.click(btn);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Cambia corso")).toBeNull();
    expect(screen.queryByText("Continua")).toBeNull();
  });

  it("P38 variante 'resume' senza lezioni pronte: il pulsante resta visibile ma disabilitato", () => {
    render(<PathHero {...base} variant="resume" canResume={false} onResume={() => {}} onSelectCourse={() => {}} />);
    const btn = screen.getByRole("button", { name: "Riprendi lezione" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("P40 vista moduli: la X sostituisce il menù ⋯ e chiude i moduli", () => {
    const onCloseModules = vi.fn();
    render(
      <PathHero
        {...base}
        variant="resume"
        onSelectCourse={() => {}}
        onCloseModules={onCloseModules}
      />,
    );
    expect(screen.queryByRole("button", { name: "Azioni corso" })).toBeNull(); // niente ⋯
    const x = screen.getByRole("button", { name: "Chiudi moduli" });
    fireEvent.click(x);
    expect(onCloseModules).toHaveBeenCalledTimes(1);
  });

  it("P40 in panoramica il menù ⋯ resta al suo posto", () => {
    render(<PathHero {...base} onSelectCourse={() => {}} />);
    expect(screen.getByRole("button", { name: "Azioni corso" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Chiudi moduli" })).toBeNull();
  });
});
