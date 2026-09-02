import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonsList } from "@/components/studio/LessonsList";
import { LessonsListSkeleton } from "@/components/studio/LessonsListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModulesOverview } from "@/components/studio/ModulesOverview";
import { BranchTopBar, PracticeLaunchers, PromptBar, SubViewHeader } from "@/components/studio/StudioPractice";

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

  it("ModulesOverview mostra solo le schede dei moduli e notifica l'apertura", () => {
    // P37: Crea nuovo percorso e i tre accessi alla pratica vivono in StudioView
    const onOpenModule = vi.fn();
    render(
      <ModulesOverview
        modules={[
          { index: 0, title: "Modulo 1", doneCount: 1, total: 5, state: "cur" },
        ]}
        onOpenModule={onOpenModule}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Modulo 1/ }));
    expect(onOpenModule).toHaveBeenCalledWith(0);
  });

  it("ModulesOverview senza moduli non renderizza nulla", () => {
    const { container } = render(<ModulesOverview modules={[]} onOpenModule={() => {}} />);
    expect(container.firstElementChild).toBeNull();
  });
});

describe("StudioPractice (P37) — accessi dedicati e ritorno", () => {
  it("P39 PracticeLaunchers: due card affiancate (2 colonne) con icone Home, sottotitoli e accento del corso", () => {
    const onEsercizi = vi.fn();
    const onInterrogazione = vi.fn();
    const { container } = render(
      <PracticeLaunchers onOpenEsercizi={onEsercizi} onOpenInterrogazione={onInterrogazione} />,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toMatch(/grid-cols-2/); // due colonne a tutta larghezza
    expect(grid.className).toMatch(/gap-3/);

    const esercizi = screen.getByRole("button", { name: "Apri Esercizi" });
    expect(screen.getByText("Quiz e flashcard")).toBeTruthy();
    const interrogazione = screen.getByRole("button", { name: "Apri Interrogazione" });
    expect(screen.getByText("Simulazione orale")).toBeTruthy();

    // ereditano l'accento cromatico del corso attivo (--subject-accent)
    expect(esercizi.className).toMatch(/border-subject-accent/);
    expect(interrogazione.className).toMatch(/border-subject-accent/);

    fireEvent.click(esercizi);
    expect(onEsercizi).toHaveBeenCalledTimes(1);
    fireEvent.click(interrogazione);
    expect(onInterrogazione).toHaveBeenCalledTimes(1);
  });

  it("P39 PromptBar: invia il testo trimmato e svuota il campo", () => {
    const onSend = vi.fn();
    const onOpen = vi.fn();
    render(<PromptBar onSend={onSend} onOpen={onOpen} />);

    const input = screen.getByLabelText("Chiedi qualcosa a Erga") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Che cos'è la fotosintesi?  " } });
    fireEvent.click(screen.getByRole("button", { name: "Invia alla Chat" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Che cos'è la fotosintesi?"); // sanitize/trim
    expect(onOpen).not.toHaveBeenCalled();
    expect(input.value).toBe(""); // campo svuotato
  });

  it("P39 PromptBar: Enter invia; vuoto o solo spazi → solo apertura della Chat", () => {
    const onSend = vi.fn();
    const onOpen = vi.fn();
    render(<PromptBar onSend={onSend} onOpen={onOpen} />);

    const input = screen.getByLabelText("Chiedi qualcosa a Erga");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled(); // nessuna chiamata inutile all'AI
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "Spiegami l'induzione elettromagnetica" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Spiegami l'induzione elettromagnetica");
  });

  it("P39 PromptBar: pillola scura con bordo sottile e respiro sopra la navbar", () => {
    const { container } = render(<PromptBar onSend={() => {}} onOpen={() => {}} />);
    const form = container.firstElementChild as HTMLElement;
    expect(form.className).toMatch(/pb-32/); // mai sotto la Bottom Navigation Bar
    const pill = form.querySelector("div") as HTMLElement;
    expect(pill.className).toMatch(/rounded-full/);
    expect(pill.className).toMatch(/border-white\/10/);
    expect(pill.className).toMatch(/bg-\[#16161A\]/);
    // il testo scorre DENTRO l'input: la pillola non si deforma
    expect(pill.className).toMatch(/items-center/);
  });

  it("SubViewHeader riporta a Studio e mostra il contesto del corso", () => {
    const onBack = vi.fn();
    render(
      <SubViewHeader title="Esercizi" courseTitle="Biologia" onBack={onBack} />,
    );
    expect(screen.getByText("Esercizi")).toBeTruthy();
    expect(screen.getByText("Biologia")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Torna a Studio" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("P38 — navigazione progressiva del corso", () => {
  it("BranchTopBar: barra compatta sticky con la pill glassy 'Ritorna ai moduli'", () => {
    const onBack = vi.fn();
    const { container } = render(
      <BranchTopBar courseTitle="Biologia" moduleIndex={1} moduleTitle="Genetica" onBack={onBack} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toMatch(/sticky top-0/); // si fissa in cima allo schermo
    expect(bar.className).toMatch(/py-2/); // compatta: py-2 + h-9 + bordo = 53px ≤ 56px
    expect(screen.getByText("Biologia · Modulo 2")).toBeTruthy();
    expect(screen.getByText("Genetica")).toBeTruthy();
    const back = screen.getByRole("button", { name: "Ritorna ai moduli" });
    expect(back.className).toMatch(/rounded-full/); // pill
    expect(back.className).toMatch(/bg-foreground\/10|bg-white\/10/); // glassy semi-trasparente
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("ModulesOverview: i moduli BLOCCATI restano inaccessibili e spiegano perché", () => {
    const onOpenModule = vi.fn();
    render(
      <ModulesOverview
        modules={[
          { index: 0, title: "Modulo 1", doneCount: 5, total: 5, state: "done" },
          { index: 1, title: "Modulo 2", doneCount: 0, total: 5, state: "lock" },
        ]}
        onOpenModule={onOpenModule}
      />,
    );
    expect(screen.getByText("Completa il modulo precedente")).toBeTruthy();
    const locked = screen.getByRole("button", { name: "Modulo 2: Modulo 2" }) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    fireEvent.click(locked); // jsdom non spara il click sui disabled, ma verifichiamo il contratto
    expect(onOpenModule).not.toHaveBeenCalled();
  });

  it("ModulesOverview: anche un corso con un SOLO modulo renderizza la sua card", () => {
    render(
      <ModulesOverview
        modules={[{ index: 0, title: "Unico modulo", doneCount: 2, total: 4, state: "cur" }]}
        onOpenModule={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Modulo 1: Unico modulo" })).toBeTruthy();
  });
});
