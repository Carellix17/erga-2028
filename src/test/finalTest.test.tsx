import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FinalTest } from "@/components/studio/FinalTest";
import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

/**
 * 🅐 FONDAMENTA — i test del TEST FINALE: dialogo accessibile, ESC,
 * flusso completo e — soprattutto — l'esito che ora viaggia verso
 * l'esterno per essere salvato nel database.
 */

const exercises: Exercise[] = [
  {
    type: "multiple_choice",
    question: "Che cos'è la fotosintesi?",
    options: ["Un processo delle piante", "Un tipo di roccia", "Una malattia", "Un'unità di misura"],
    correct_index: 0,
  },
  {
    type: "true_false",
    statement: "La fotosintesi avviene di notte.",
    correct: false,
  },
];

function renderTest(overrides: Partial<Parameters<typeof FinalTest>[0]> = {}) {
  const onClose = vi.fn();
  const onComplete = vi.fn();
  render(
    <FinalTest
      exercises={exercises}
      onClose={onClose}
      onComplete={onComplete}
      {...overrides}
    />,
  );
  return { onClose, onComplete };
}

function continua(): HTMLElement {
  // Ancorato: il nome esatto del bottone in basso. Così non collide con
  // la «Chiudi il test» (X) in alto, che ha un'etichetta più lunga.
  return screen.getByRole("button", { name: /^(continua|vedi risultati|chiudi)$/i });
}

describe("FinalTest — accessibilità (🅐)", () => {
  it("è un dialogo vero con nome accessibile", () => {
    renderTest();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Test Finale");
  });

  it("ESC chiude il test", () => {
    const { onClose } = renderTest();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("il tasto di chiusura ha un nome accessibile (non è solo una X)", () => {
    renderTest();
    expect(screen.getByRole("button", { name: /chiudi il test/i })).toBeTruthy();
  });
});

describe("FinalTest — flusso e salvataggio dell'esito", () => {
  it("si avanza solo dopo aver risposto", () => {
    renderTest();
    expect(continua()).toBeDisabled();
  });

  it("a fine test consegna {score, correct, total} a onComplete", async () => {
    const { onComplete } = renderTest();

    // domanda 1 — risponde la GIUSTA
    fireEvent.click(screen.getByRole("button", { name: /un processo delle piante/i }));
    await waitFor(() => expect(continua()).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(continua());

    // domanda 2 — risponde FALSO (che è la risposta giusta: correct=false)
    await waitFor(() => expect(screen.getByText(/la fotosintesi avviene di notte/i)).toBeTruthy(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /^falso$/i }));
    await waitFor(() => expect(continua()).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(continua()); // «Vedi risultati»

    // schermata risultati: 100%
    expect(await screen.findByText("100%")).toBeTruthy();
    expect(screen.getByText(/ottimo risultato/i)).toBeTruthy();
    // l'esito è annunciato agli screen reader
    expect(screen.getByRole("status")).toBeTruthy();

    // chiude → onComplete con l'esito da salvare
    fireEvent.click(continua()); // «Chiudi»
    expect(onComplete).toHaveBeenCalledWith({ score: 100, correct: 2, total: 2 });
  });

  it("una risposta sbagliata abbassa il punteggio", async () => {
    const { onComplete } = renderTest();

    // domanda 1 — risponde una SBAGLIATA
    fireEvent.click(screen.getByRole("button", { name: /un tipo di roccia/i }));
    await waitFor(() => expect(continua()).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(continua());

    // domanda 2 — VERO (sbagliato: la risposta giusta è falso)
    await waitFor(() => expect(screen.getByText(/la fotosintesi avviene di notte/i)).toBeTruthy(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /^vero$/i }));
    await waitFor(() => expect(continua()).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(continua());

    expect(await screen.findByText("0%")).toBeTruthy();
    fireEvent.click(continua());
    expect(onComplete).toHaveBeenCalledWith({ score: 0, correct: 0, total: 2 });
  });
});
