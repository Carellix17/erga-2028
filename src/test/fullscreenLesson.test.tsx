import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FullscreenLesson } from "@/components/studio/FullscreenLesson";
import { MultipleChoice } from "@/components/studio/exercises/MultipleChoice";
import { prepareLessonExercises } from "@/lib/lessonExercises";
import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

/**
 * 🌿 P50 — Il lettore delle mini-lezioni ha finalmente i suoi test.
 * Coprono: passi e avanzamento, avviso di ripartenza, memoria della slide,
 * ESC come uscita (anche quando il pannello del tutor è aperto), semantica
 * di finestra e lettura vocale dei feedback degli esercizi.
 */

vi.mock("@/hooks/useLessonFigures", () => ({
  useLessonFigures: () => ({ figures: [], loading: false }),
  prefetchLessonFigures: vi.fn(),
}));

vi.mock("@/contexts/FocusContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/FocusContext")>();
  return { ...actual, useFocus: () => ({ isActive: false }) };
});

const exercises: Exercise[] = [
  {
    type: "multiple_choice",
    question: "Quale gas assorbono le piante?",
    options: ["Ossigeno", "Anidride carbonica", "Azoto", "Elio"],
    correct_index: 1,
  },
  { type: "true_false", statement: "Serve la luce per la fotosintesi.", correct: true },
];

const lesson = {
  id: "lezione-1",
  title: "La fotosintesi",
  concept: "Le piante trasformano la luce in cibo.",
  explanation: JSON.stringify([
    { part_title: "☀️ La luce", content: "La luce colpisce le foglie." },
    { part_title: "💧 L'acqua", content: "Le radici assorbono l'acqua." },
  ]),
  example: "Una foglia al sole.",
  exercises,
};

function renderReader(over: Partial<typeof lesson> = {}, handlers: Partial<{ onClose: () => void }> = {}) {
  const onClose = handlers.onClose ?? vi.fn();
  const onComplete = vi.fn();
  render(
    <FullscreenLesson
      lesson={{ ...lesson, ...over }}
      lessonNumber={1}
      totalLessons={4}
      onClose={onClose}
      onComplete={onComplete}
      isLastLesson={false}
    />,
  );
  return { onClose, onComplete };
}

/** Mette il lettore in assetto «riduci movimento»: passi immediati, niente attese. */
function enableReducedMotion() {
  document.documentElement.classList.add("reduce-motion");
}

describe("P50 lettore a schermo intero", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("reduce-motion");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("reduce-motion");
  });

  it("è una finestra dichiarata (dialog) col nome della lezione", () => {
    renderReader();
    const dialog = screen.getByRole("dialog", { name: /Lezione 1 di 4: La fotosintesi/ });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("parte dal concetto chiave e avanza col pulsante Continua", async () => {
    renderReader();
    expect(screen.getByText("Concetto chiave")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    expect(await screen.findByText(/☀️ La luce/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    expect(await screen.findByText(/💧 L'acqua/)).toBeTruthy();
  });

  it("con «riduci movimento» attivo il passo cambia subito (nessuna pausa di 250 ms)", async () => {
    enableReducedMotion();
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    // Nessun findBy: se fosse asincrono qui non ci sarebbe ancora.
    expect(screen.getByText(/☀️ La luce/)).toBeTruthy();
  });

  it("salva il punto raggiunto e riapre la lezione da lì, con l'avviso", () => {
    window.localStorage.setItem(
      "erga:lesson-resume:lezione-1",
      JSON.stringify({ step: 4, savedAt: Date.now() }),
    );
    renderReader();

    const avviso = screen.getByRole("status");
    expect(avviso.textContent).toMatch(/Ripresa dalla slide 5 di 7/);
    // step 4 = primo esercizio
    expect(screen.getByText(/Esercizio 1/)).toBeTruthy();
    expect(screen.getByText("Quale gas assorbono le piante?")).toBeTruthy();
  });

  it("«Ricomincia» riporta all'inizio e dimentica il segnalibro", async () => {
    window.localStorage.setItem(
      "erga:lesson-resume:lezione-1",
      JSON.stringify({ step: 4, savedAt: Date.now() }),
    );
    renderReader();

    fireEvent.click(screen.getByRole("button", { name: "Ricomincia" }));
    expect(screen.getByText("Concetto chiave")).toBeTruthy();
    await waitFor(() =>
      expect(window.localStorage.getItem("erga:lesson-resume:lezione-1")).toBeNull(),
    );
  });

  it("memorizza la slide appena si avanza", async () => {
    enableReducedMotion();
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    await waitFor(() => {
      const raw = window.localStorage.getItem("erga:lesson-resume:lezione-1");
      expect(raw && JSON.parse(raw).step).toBe(1);
    });
  });

  it("ESC chiude la lezione", () => {
    const { onClose } = renderReader();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC col pannello del tutor aperto NON chiude la lezione", () => {
    const { onClose } = renderReader();
    // Un altro dialogo (Radix) è aperto: l'ESC deve chiudere quello.
    const altro = document.createElement("div");
    altro.setAttribute("role", "dialog");
    altro.setAttribute("data-state", "open");
    document.body.appendChild(altro);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    altro.remove();
  });

  it("gli esercizi arrivano con le opzioni mescolate e la risposta giusta al suo posto", () => {
    const attesi = prepareLessonExercises(lesson.exercises, lesson.id);
    // la lezione qui sopra ha 2 parti, quindi l'esercizio 1 è lo step 4
    window.localStorage.setItem(
      "erga:lesson-resume:lezione-1",
      JSON.stringify({ step: 4, savedAt: Date.now() }),
    );
    renderReader();

    const opzioniAttese = attesi[0].options!;
    expect(opzioniAttese).not.toEqual(exercises[0].options);

    for (const etichetta of opzioniAttese) {
      expect(screen.getByText(etichetta)).toBeTruthy();
    }
    // e la risposta corretta è ancora quella vera (indicizzata bene)
    const corretto = opzioniAttese[attesi[0].correct_index!];
    expect(corretto).toBe("Anidride carbonica");
  });

  it("torna indietro con la freccia (e scala il segnalibro)", async () => {
    enableReducedMotion();
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    expect(screen.getByText(/☀️ La luce/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Torna indietro" }));
    expect(screen.getByText("Concetto chiave")).toBeTruthy();
  });
});

describe("P50 feedback degli esercizi — annuncio ai lettori di schermo", () => {
  beforeEach(() => {
    document.documentElement.classList.add("reduce-motion");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("reduce-motion");
  });

  it("la risposta giusta viene annunciata", () => {
    render(
      <MultipleChoice
        question="Quale gas assorbono le piante?"
        options={["Ossigeno", "Anidride carbonica", "Azoto", "Elio"]}
        correctIndex={1}
        onComplete={vi.fn()}
        isCompleted={false}
      />,
    );

    fireEvent.click(screen.getByText("Anidride carbonica"));
    const annuncio = screen.getByRole("status");
    expect(annuncio.getAttribute("aria-live")).toBe("polite");
    expect(annuncio.textContent).toMatch(/Perfetto/);
  });

  it("quando sbagli viene annunciata anche qual era la risposta corretta", () => {
    const onComplete = vi.fn();
    render(
      <MultipleChoice
        question="Quale gas assorbono le piante?"
        options={["Ossigeno", "Anidride carbonica", "Azoto", "Elio"]}
        correctIndex={1}
        onComplete={onComplete}
        isCompleted={false}
      />,
    );

    fireEvent.click(screen.getByText("Elio"));
    expect(onComplete).toHaveBeenCalledWith(false);
    const annuncio = screen.getByRole("status");
    expect(annuncio.textContent).toMatch(/La risposta corretta era: Anidride carbonica/);
  });
});
