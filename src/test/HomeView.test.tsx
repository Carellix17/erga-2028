import { fireEvent, render, screen } from "@testing-library/react";
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
  onOpenPratica: vi.fn(),
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

  it("renderizza i componenti modulari: header, card corso, strumenti e piano del giorno", () => {
    render(<HomeView {...callbacks} />);
    // HomeHeader: saluto con nome reale
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Vale");
    // CourseHeroCard (il corso "Fisica" appare anche come materia nel piano)
    expect(screen.getAllByText("Fisica").length).toBeGreaterThan(0);
    // Titolo corto → resta al gradone (text-3xl, sm:text-4xl)
    const courseHeading = screen.getByRole("heading", { name: "Fisica" });
    expect(courseHeading.className).toContain("text-3xl");
    expect(screen.getByText("Percorso attivo")).toBeInTheDocument();
    expect(screen.getByText("Il moto rettilineo")).toBeInTheDocument();
    expect(screen.getByText("3 di 10 lezioni")).toBeInTheDocument();
    // Anello di avanzamento presente (nessun menù a tre puntini)
    expect(screen.getByRole("img", { name: /avanzamento del percorso: 20%/i })).toBeInTheDocument();
    // QuickToolsGrid
    expect(screen.getByText("Carica materiale")).toBeInTheDocument();
    expect(screen.getByText("AI Tutor")).toBeInTheDocument();
    expect(screen.getByText("Crea esercizi")).toBeInTheDocument();
    expect(screen.getByText("Interrogazione")).toBeInTheDocument();
    // DailyTimeline
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
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

  it("ogni pillola degli strumenti risponde al click con la destinazione giusta", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByText("Carica materiale"));
    expect(callbacks.onUpload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("AI Tutor"));
    expect(callbacks.onOpenPratica).toHaveBeenCalledWith("chat");
    fireEvent.click(screen.getByText("Crea esercizi"));
    expect(callbacks.onOpenPratica).toHaveBeenCalledWith("esercizi");
    fireEvent.click(screen.getByText("Interrogazione"));
    expect(callbacks.onOpenPratica).toHaveBeenCalledWith("interrogazione");
  });

  it("non mostra né collega il profilo cognitivo dalla Home", () => {
    render(<HomeView {...callbacks} />);
    expect(screen.queryByText(/profilo cognitivo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /profilo cognitivo/i })).not.toBeInTheDocument();
  });

  it("le pillole degli strumenti rapidi sono capsule rounded-full", () => {
    render(<HomeView {...callbacks} />);
    ["Carica materiale", "AI Tutor", "Crea esercizi", "Interrogazione"].forEach((label) => {
      const btn = screen.getByText(label).closest("button");
      expect(btn?.className).toContain("rounded-full");
    });
  });

  it("le etichette degli strumenti rapidi restano intere, senza troncamento", () => {
    render(<HomeView {...callbacks} />);
    const label = screen.getByText("Carica materiale");
    expect(label.className).not.toMatch(/truncate|line-clamp/);
    // la ciambella mantiene la percentuale visibile accanto al titolo
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("la Home spegne l'alone ambientale (no-ambient) per un fondo pulito", () => {
    const { container } = render(<HomeView {...callbacks} />);
    expect(container.firstElementChild?.className).toContain("no-ambient");
  });

  it("rispetta i target touch minimi (44px) sui controlli principali", () => {
    render(<HomeView {...callbacks} />);
    const mainLabels = ["Carica materiale", "AI Tutor", "Crea esercizi", "Interrogazione", "Riprendi lezione"];
    mainLabels.forEach((label) => {
      const btn = screen.getByText(label).closest("button");
      expect(btn).toBeTruthy();
      const cls = btn?.className ?? "";
      expect(cls).toMatch(/min-h-\[5[0-9]px\]|h-11|h-12/);
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
    expect(root?.className).toContain("overflow-x-clip");
    expect(root?.className).toContain("min-w-0");
    const heading = screen.getByRole("heading", { level: 1 });
    // Il saluto non si tronca: va a capo in modo bilanciato senza sfondare.
    expect(heading.className).toMatch(/text-balance|break-words/);
    expect(heading.className).not.toMatch(/truncate/);
    // Il titolo del corso segue lo stile Studio: va a capo (break-words)
    const courseTitle = screen.getByText(/Materia con nome lunghissimo/);
    expect(courseTitle.className).toMatch(/truncate|line-clamp|break-words/);
    // Titolo lungo → un gradino più piccolo (text-2xl, mai text-4xl)
    expect(courseTitle.className).toContain("text-2xl");
    expect(courseTitle.className).not.toContain("text-4xl");
    const lessonTitle = screen.getByText(/Titolo lunghissimo/);
    expect(lessonTitle.className).toMatch(/truncate|line-clamp/);
  });

  it("il compito del piano del giorno avvia una sessione Focus quando consentito", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByText("Ripasso cinematica"));
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Ripasso cinematica", subject: "Fisica" }),
    );
  });
});
