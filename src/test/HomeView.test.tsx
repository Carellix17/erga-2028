import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home/HomeView";
import { useHomeDashboard, type HomeDashboardData } from "@/hooks/useHomeDashboard";
const startSession = vi.fn();
const openSetup = vi.fn();

vi.mock("@/hooks/useHomeDashboard", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useHomeDashboard")>("@/hooks/useHomeDashboard");
  return { ...actual, useHomeDashboard: vi.fn() };
});

vi.mock("@/contexts/FocusContext", () => ({
  useFocus: () => ({ startSession, openSetup, openFullscreen: vi.fn(), isActive: false }),
}));

vi.mock("@/hooks/useCourseImage", () => ({
  useCourseImage: () => null,
}));

const dashboardData: HomeDashboardData = {
  displayName: "Vale",
  resumeLesson: {
    contextId: "ctx-1",
    lessonIndex: 2,
    lessonTitle: "Il moto rettilineo",
    courseTitle: "Fisica",
    coverUrl: null,
    lessonNumber: 3,
    lessonCount: 10,
    progressPercent: 20,
  },
  activeContextId: "ctx-1",
  hasContexts: true,
  isGenerating: false,
  todayTasks: [
    {
      id: "event-e1",
      sourceId: "e1",
      source: "event",
      title: "Ripasso cinematica",
      subject: "Fisica",
      time: "15:30",
      kind: "study",
      isCompleted: false,
      canStartFocus: true,
    },
  ],
  nextEvaluation: {
    id: "v1",
    title: "Cinematica",
    subject: "Fisica",
    daysAway: 3,
    date: "2026-08-23T08:00:00.000Z",
  },
  minutesToday: 32,
  sessionsToday: 2,
  completedActivities: 1,
  streakDays: 12,
  focusSessions: [],
};

const callbacks = {
  onOpenStudio: vi.fn(),
  onResumeLesson: vi.fn(),
  onOpenPlan: vi.fn(),
  onUpload: vi.fn(),
};

function mockDashboard(data: HomeDashboardData | undefined = dashboardData, overrides: Record<string, unknown> = {}) {
  vi.mocked(useHomeDashboard).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useHomeDashboard>);
}

function queryHomeRoot(container: HTMLElement): HTMLElement | null {
  return container.firstElementChild as HTMLElement | null;
}

describe("HomeView modulare (V3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboard();
  });

  it("mostra il percorso e, sotto, solo il piano del giorno", () => {
    const { container } = render(<HomeView {...callbacks} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Vale");
    expect(screen.getAllByText("Fisica").length).toBeGreaterThan(0);
    const courseHeading = screen.getByRole("heading", { name: "Fisica" });
    expect(courseHeading.className).toContain("text-3xl");
    expect(screen.getByText("Il moto rettilineo")).toBeInTheDocument();
    expect(screen.getByText("Lezione 3 di 10")).toBeInTheDocument();
    const courseCard = courseHeading.closest("article");
    expect(courseCard).toHaveClass("bg-[#FFFBF4]", "text-[#0a0a0a]", "rounded-[24px]");
    expect(container.querySelector("[data-cover-root]")).toBeNull();
    const progress = screen.getByRole("progressbar", { name: /avanzamento del percorso: 20%/i });
    expect(progress).toHaveAttribute("aria-valuenow", "20");

    const timeline = screen.getByRole("heading", { name: "Piano del giorno" });
    expect(courseHeading.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Il tuo esagono" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Interrogazione" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Esercizi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carica materiale" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chat" })).not.toBeInTheDocument();
    expect(screen.queryByText(/azioni consigliate/i)).not.toBeInTheDocument();
    expect(container.querySelector(".cognitive-grid")).toBeNull();

    const dayCard = timeline.closest("section");
    expect(dayCard).toHaveClass("bg-[#FFFBF4]", "text-[#0a0a0a]", "rounded-[24px]");
    const openPlan = screen.getByRole("button", { name: "Vedi Piano" });
    expect(openPlan).toHaveClass("rounded-[24px]", "bg-[#0a0a0a]", "text-[#FFFBF4]");
  });

  it("il saluto e il nome stanno su due righe: due span a blocco nello stesso h1", () => {
    render(<HomeView {...callbacks} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const lines = Array.from(heading.querySelectorAll("span"));
    expect(lines).toHaveLength(2);
    // prima riga: solo il saluto (senza virgola né nome), seconda riga: solo il nome
    expect(lines[0].textContent).toMatch(/^Buon(giorno|asera)$/);
    expect(lines[0].textContent).not.toContain("Vale");
    expect(lines[1].textContent).toBe("Vale");
    lines.forEach((line) => expect(line.className).toContain("block"));
    // il nome accessibile resta un unico titolo leggibile, es. "Buongiorno Vale"
    expect(heading).toHaveAccessibleName(/^Buon(giorno|asera) Vale$/);
  });

  it("mostra il 100% quando la Home riceve un corso completato", () => {
    mockDashboard({
      ...dashboardData,
      resumeLesson: {
        ...dashboardData.resumeLesson!,
        lessonNumber: 10,
        lessonCount: 10,
        progressPercent: 100,
      },
    });
    render(<HomeView {...callbacks} />);

    expect(screen.getByRole("progressbar", { name: /avanzamento del percorso: 100%/i })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("la CTA della card corso riprende la lezione reale", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: /riprendi lezione/i }));
    expect(callbacks.onResumeLesson).toHaveBeenCalledWith("ctx-1", 2);
  });

  it("stato senza corso: invito a scegliere/caricare e CTA upload", () => {
    mockDashboard({
      ...dashboardData,
      resumeLesson: null,
      hasContexts: false,
      isGenerating: false,
    });
    render(<HomeView {...callbacks} />);
    expect(screen.getByText("Scegli o carica il tuo primo percorso")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /aggiungi materiale/i }));
    expect(callbacks.onUpload).toHaveBeenCalledTimes(1);
  });

  it("stato generazione in corso: mostra il messaggio dedicato e porta allo Studio", () => {
    mockDashboard({
      ...dashboardData,
      resumeLesson: null,
      hasContexts: true,
      isGenerating: true,
    });
    render(<HomeView {...callbacks} />);
    expect(screen.getByText("Il tuo percorso è in preparazione")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /apri studio/i }));
    expect(callbacks.onOpenStudio).toHaveBeenCalledTimes(1);
  });

  it("senza attività la card del giorno è avorio e il pulsante nero apre il Piano", () => {
    mockDashboard({ ...dashboardData, todayTasks: [] });
    render(<HomeView {...callbacks} />);
    const title = screen.getByRole("heading", { name: "Nessuna attività prevista" });
    const card = title.closest("section");
    expect(card).toHaveClass("bg-[#FFFBF4]", "text-[#0a0a0a]", "rounded-[24px]");
    expect(title).toHaveClass("text-[#0a0a0a]");
    expect(screen.getByText("Puoi lasciare libero il pomeriggio oppure organizzare una sessione.")).toHaveClass("text-[#3a3a3a]");
    const organize = screen.getByRole("button", { name: "Organizza la settimana" });
    expect(organize).toHaveClass("rounded-[24px]", "bg-[#0a0a0a]", "text-[#FFFBF4]");
    fireEvent.click(organize);
    expect(callbacks.onOpenPlan).toHaveBeenCalledTimes(1);
  });

  it("i pulsanti della Home hanno angoli da 24px e l'etichetta intera", () => {
    render(<HomeView {...callbacks} />);
    for (const label of ["Riprendi lezione", "Vedi Piano"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.className).toContain("rounded-[24px]");
      expect(button.className).not.toContain("rounded-full");
      expect(button.className).not.toContain("rounded-[999");
      expect(button.textContent).toContain(label);
    }
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("la Home ha il tavolo piatto: niente aloni ambientali (sistema rimosso in V2-01)", () => {
    const { container } = render(<HomeView {...callbacks} />);
    // il sistema aura è stato rimosso dal CSS: la Home non porta marcatori
    expect(container.firstElementChild?.className).not.toContain("no-ambient");
    const css = readFileSync(join(__dirname, "../index.css"), "utf8");
    expect(css).not.toContain("P27 — AURA ANIMATA");
  });

  it("rispetta i target touch minimi (44px) sui controlli principali", () => {
    render(<HomeView {...callbacks} />);
    const mainLabels = ["Riprendi lezione", "Vedi Piano"];
    mainLabels.forEach((label) => {
      const btn = screen.getByText(label).closest("button");
      expect(btn).toBeTruthy();
      const cls = btn?.className ?? "";
      // V2-01: h-11/h-12 via classi, oppure il satinato .btn-satin
      // (altezza 44px dichiarata nel CSS condiviso, DESIGN.md 2.1 §4)
      expect(cls).toMatch(/min-h-\[5[0-9]px\]|h-11|h-12|btn-satin/);
    });
  });

  it("non provoca overflow orizzontale: contenitore con clip e saluto che va a capo", () => {
    mockDashboard({
      ...dashboardData,
      displayName: "Alessandro Molto Lungo Con Nome Che Non Finisce Mai",
      resumeLesson: {
        ...dashboardData.resumeLesson!,
        lessonTitle: "Titolo lunghissimo che dovrebbe essere troncato per non rompere il layout della card corso",
        courseTitle: "Materia con nome lunghissimo che deve essere troncato",
      },
    });
    const { container } = render(<HomeView {...callbacks} />);
    const root = queryHomeRoot(container);
    expect(root?.className).toContain("min-w-0");
    const heading = screen.getByRole("heading", { level: 1 });
    // Il saluto non si tronca: va a capo in modo bilanciato senza sfondare.
    expect(heading.className).toMatch(/text-balance|break-words/);
    expect(heading.className).not.toMatch(/truncate/);
    // Il titolo del corso va a capo per intero, senza troncamento.
    const courseTitle = screen.getByText(/Materia con nome lunghissimo/);
    expect(courseTitle.className).toContain("break-words");
    expect(courseTitle.className).not.toContain("truncate");
    const lessonTitle = screen.getByText(/Titolo lunghissimo/);
    expect(lessonTitle.className).toContain("break-words");
  });

  it("il compito del piano del giorno avvia una sessione Focus quando consentito", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByText("Ripasso cinematica"));
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Ripasso cinematica", subject: "Fisica" }),
    );
  });
});

