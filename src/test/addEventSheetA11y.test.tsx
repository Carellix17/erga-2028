import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddEventSheet } from "@/components/piano/AddEventSheet";

vi.mock("@/hooks/useUserSubjects", () => ({
  useUserSubjects: () => ({
    data: [{ id: "subject-1", user_id: "user-1", name: "Matematica", color: null }],
  }),
}));

vi.mock("@/hooks/useFileContexts", () => ({
  useFileContextsQuery: () => ({
    data: [{ id: "course-1", file_name: "Algebra", created_at: "2026-01-01", lesson_count: 1 }],
  }),
}));

function renderOpenSheet() {
  return render(
    <AddEventSheet
      open
      onOpenChange={() => {}}
      onSubmit={() => {}}
    />,
  );
}

describe("AddEventSheet — accessibilità dei controlli", () => {
  it("espone Materia, Titolo e Argomento libero con i rispettivi nomi accessibili", () => {
    renderOpenSheet();

    expect(screen.getByRole("combobox", { name: /Materia/ })).toBeInTheDocument();
    const title = screen.getByRole("textbox", { name: "Titolo" });
    expect(title).toHaveAttribute("placeholder", "Es. Verifica sui Promessi Sposi");
    expect(screen.getByRole("textbox", { name: "Argomento" })).toBeInTheDocument();
  });

  it("espone Argomento come nome del selettore Da corso", () => {
    renderOpenSheet();

    fireEvent.click(screen.getByRole("radio", { name: "Da corso" }));

    expect(screen.getByRole("combobox", { name: /Argomento/ })).toBeInTheDocument();
  });

  it("nomina la modalità corrente e espone le opzioni come radio con lo stato attivo", async () => {
    renderOpenSheet();

    fireEvent.pointerDown(screen.getByRole("button", { name: /Modalità:\s*Scritta/ }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });

    const oralTest = await screen.findByRole("menuitemradio", { name: "Interrogazione" });
    expect(oralTest).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Scritta" })).toHaveAttribute("aria-checked", "true");
  });

  it("collega l'etichetta Obiettivo di voto allo slider dopo aver aggiunto le note", () => {
    renderOpenSheet();

    fireEvent.click(screen.getByRole("button", { name: /Aggiungi note/i }));

    expect(screen.getByRole("slider", { name: "Obiettivo di voto" })).toBeInTheDocument();
  });
});
