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

  it("espone le modalità come radio sempre visibili, con Scritta attiva", () => {
    renderOpenSheet();

    expect(screen.getByRole("radio", { name: "Scritta" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Interrogazione" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Orale" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pratica" })).toBeInTheDocument();
  });

  it("collega l'etichetta Obiettivo di voto allo slider solo dopo aver impostato un obiettivo", () => {
    renderOpenSheet();

    expect(screen.queryByRole("slider", { name: "Obiettivo di voto" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aggiungi note/i }));

    expect(screen.getByRole("button", { name: "Imposta obiettivo" })).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Obiettivo di voto" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imposta obiettivo" }));
    expect(screen.getByRole("slider", { name: "Obiettivo di voto" })).toBeInTheDocument();
  });
});
