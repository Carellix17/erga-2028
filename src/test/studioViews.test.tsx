import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonsListSkeleton } from "@/components/studio/LessonsListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModulesOverview } from "@/components/studio/ModulesOverview";
import { ModuleHeaderCard, PracticeLaunchers, SheetDrawer, SubViewHeader } from "@/components/studio/StudioPractice";

/**
 * 🌿 P21b — Collaudo di accensione della schermata Studio in salotto.
 * 🅐 FONDAMENTA — LessonsList è stato rimosso (codice morto): i suoi test
 * sono stati tolti con lui. Restano i collaudi dei pezzi vivi.
 */

describe("P21b pilota Studio — accensione", () => {
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
  it("P39/P50 PracticeLaunchers: il Banco di Studio — chat, esercizi, interrogazione (+ palestra per i corsi scientifici)", () => {
    const onChat = vi.fn();
    const onEsercizi = vi.fn();
    const onInterrogazione = vi.fn();
    const onPalestra = vi.fn();
    const { container } = render(
      <PracticeLaunchers
        onOpenChat={onChat}
        onOpenEsercizi={onEsercizi}
        onOpenInterrogazione={onInterrogazione}
      />,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toMatch(/grid-cols-2/); // due colonne a tutta larghezza
    expect(grid.className).toMatch(/gap-3/);

    // senza palestra: tre strumenti (chat + esercizi + interrogazione)
    const chat = screen.getByRole("button", { name: "Apri Chat" });
    expect(screen.getByText("Chiedi a Erga")).toBeTruthy();
    const esercizi = screen.getByRole("button", { name: "Apri Esercizi" });
    expect(screen.getByText("Quiz e flashcard")).toBeTruthy();
    const interrogazione = screen.getByRole("button", { name: "Apri Interrogazione" });
    expect(screen.getByText("Simulazione orale")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Apri Palestra" })).toBeNull();

    fireEvent.click(chat);
    expect(onChat).toHaveBeenCalledTimes(1);

    // ereditano l'accento cromatico del corso attivo (--subject-accent)
    expect(esercizi.className).toMatch(/border-subject-accent/);
    expect(interrogazione.className).toMatch(/border-subject-accent/);

    fireEvent.click(esercizi);
    expect(onEsercizi).toHaveBeenCalledTimes(1);
    fireEvent.click(interrogazione);
    expect(onInterrogazione).toHaveBeenCalledTimes(1);

    // con la palestra (corso scientifico): quarta card
    const palestraRender = render(
      <PracticeLaunchers
        onOpenChat={onChat}
        onOpenEsercizi={onEsercizi}
        onOpenInterrogazione={onInterrogazione}
        onOpenPalestra={onPalestra}
      />,
    );
    const palestra = screen.getByRole("button", { name: "Apri Palestra" });
    expect(screen.getByText("Tutor socratico")).toBeTruthy();
    fireEvent.click(palestra);
    expect(onPalestra).toHaveBeenCalledTimes(1);
    palestraRender.unmount();
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
  it("P43 ModuleHeaderCard: morph condiviso e IDENTITÀ CROMATICA della materia", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModuleHeaderCard
        courseTitle="La guerra dei cent'anni"
        moduleIndex={0}
        moduleTitle="Introduzione e Contesto Storico dal 1337 al 1449"
        subjectColor="#7c9a7e"
        layoutId="course-card-ctx-1"
        onClose={onClose}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    // stessa superficie della hero: layoutId per il morph, stesso bordo
    // inchiostro dichiarato dalla copertina (come CourseCard/PathHero), non misurato
    expect(card.hasAttribute("data-auto-contrast")).toBe(false);
    expect(card.getAttribute("style")).toContain("--contrast-ink");
    expect(card.className).toMatch(/rounded-card/);
    expect(card.className).toMatch(/border-inverse-on-surface\/15/);
    // il colore materia arriva come variabile (stessa usata dalla hero)
    expect(card.getAttribute("style")).toContain("--ambient-block-ink");
    expect(card.getAttribute("style")).toContain("#7c9a7e");
    // titolo del modulo GRANDE, senza troncamento (break-words, mai truncate)
    const title = screen.getByText("Introduzione e Contesto Storico dal 1337 al 1449");
    expect(title.className).toMatch(/text-lg/);
    expect(title.className).toMatch(/break-words/);
    expect(title.className).not.toMatch(/truncate/);
    // nome del percorso piccolo, in tono secondario
    const course = screen.getByText("La guerra dei cent'anni");
    expect(course.className).toMatch(/text-xs/);
    expect(course.className).toMatch(/text-contrast-secondary/);
    // etichetta MODULO 1 (uppercase via classe)
    expect(screen.getByText("Modulo 1").className).toMatch(/uppercase/);
    // X con target tattile ≥ 44px che riporta ai moduli
    const x = screen.getByRole("button", { name: "Chiudi modulo" });
    expect(x.className).toMatch(/h-11 w-11/);
    fireEvent.click(x);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("P42 SheetDrawer: stesso velo del doc di caricamento, X fissa in alto a destra, chiude tutto", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SheetDrawer title="Interrogazione" step="select" onClose={onClose}>
        <p>Contenuto di scelta</p>
      </SheetDrawer>,
    );
    const dialog = screen.getByRole("dialog", { name: "Interrogazione" });
    const backdrop = dialog.firstElementChild as HTMLElement;
    // decisione proprietario (7 ottobre 2026): il velo è lo STESSO del doc di
    // caricamento materiali — scrim al 40% + sfocatura leggera (blur-sm),
    // mai nero pieno né vetro pesante
    expect(backdrop.className).toMatch(/bg-scrim\/40/);
    expect(backdrop.className).toMatch(/backdrop-blur-sm/);
    expect(backdrop.className).not.toMatch(/bg-black\/50/);
    const sheet = dialog.children[1] as HTMLElement;
    expect(sheet.className).toMatch(/h-\[100dvh\]/); // foglio alto quanto il viewport
    expect(sheet.className).toMatch(/rounded-t-/); // bordi superiori stondati
    expect(sheet.getAttribute("data-step")).toBe("select");
    const x = screen.getByRole("button", { name: "Chiudi" });
    expect(x.className).toMatch(/h-11 w-11/); // target tattile ≥ 44px
    fireEvent.click(x);
    expect(onClose).toHaveBeenCalledTimes(1); // esce TUTTO il flusso
    // il tocco sul backdrop chiude
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("P42 SheetDrawer: passo 'active' → foglio a schermo intero (data-step)", () => {
    render(
      <SheetDrawer title="Esercizi" step="active" onClose={() => {}}>
        <p>Sessione</p>
      </SheetDrawer>,
    );
    const sheet = screen.getByRole("dialog", { name: "Esercizi" }).children[1] as HTMLElement;
    expect(sheet.getAttribute("data-step")).toBe("active");
    // la X resta nello stesso punto in alto a destra
    expect(screen.getByRole("button", { name: "Chiudi" }).className).toMatch(/absolute right-3/);
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
