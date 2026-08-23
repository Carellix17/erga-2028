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
  useFocus: () => ({ startSession, openSetup }),
}));

vi.mock("@/components/studio/CourseCardBackground", () => ({
  CourseCardBackground: () => <div data-testid="course-background" />,
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
  streakDays: 4,
  focusSessions: [
    {
      id: "focus-1",
      actualDuration: 32,
      completedAt: "2026-08-23T14:30:00.000Z",
      subjectName: "Fisica",
      taskLabel: "Ripasso cinematica",
    },
  ],
};

const callbacks = {
  onOpenStudio: vi.fn(),
  onResumeLesson: vi.fn(),
  onOpenPlan: vi.fn(),
  onOpenPratica: vi.fn(),
  onOpenCognitive: vi.fn(),
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

describe("HomeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboard();
  });

  it("mantiene la Home concentrata sulle attività e sposta il riepilogo Focus", () => {
    render(<HomeView {...callbacks} />);

    expect(screen.getByText("Vale")).toBeInTheDocument();
    expect(screen.getByText("Il moto rettilineo")).toBeInTheDocument();
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dati reali dalle sessioni Focus" })).not.toBeInTheDocument();
    expect(screen.queryByText("minuti oggi")).not.toBeInTheDocument();
    expect(screen.queryByText("giorni di serie")).not.toBeInTheDocument();
  });

  it("mantiene il messaggio secondario della Home solo da tablet in poi", () => {
    mockDashboard({
      ...dashboardData,
      todayTasks: [],
      nextEvaluation: null,
      completedActivities: 0,
      sessionsToday: 0,
    });
    render(<HomeView {...callbacks} />);

    expect(screen.getByText("Hai una lezione da riprendere")).toHaveClass("hidden", "md:block");
    expect(screen.queryByText("Completa la prima sessione Focus per iniziare a vedere il tuo ritmo.")).not.toBeInTheDocument();
  });

  it("mostra la lezione prima del piano del giorno", () => {
    render(<HomeView {...callbacks} />);

    const resumeTitle = screen.getByRole("heading", { name: "Il moto rettilineo" });
    const todayTitle = screen.getByRole("heading", { name: "Piano del giorno" });

    expect(resumeTitle.compareDocumentPosition(todayTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adatta la card della lezione al contenuto con padding uniforme", () => {
    render(<HomeView {...callbacks} />);

    const card = screen.getByTestId("resume-lesson-card");
    const button = screen.getByRole("button", { name: /Riprendi lezione/i });
    const content = button.parentElement;

    expect(card).toHaveClass("h-auto");
    expect(card.className).not.toMatch(/min-h-|h-\[/);
    expect(content).toHaveClass("p-5", "sm:p-6");
    expect(content?.className).not.toMatch(/(?:^|\s)(?:p[bt]-)/);
  });

  it("mantiene il fondo chiaro dei blocchi operativi e li lega all'inchiostro caldo", () => {
    render(<HomeView {...callbacks} />);

    const dailyPlanCard = screen.getByTestId("home-daily-plan-card");
    const focusCard = screen.getByTestId("home-focus-timer-card");

    expect(dailyPlanCard).toHaveClass("bg-off-white", "text-[#181516]");
    expect(focusCard).toHaveClass("bg-off-white", "text-[#181516]");
    expect(dailyPlanCard.className).toContain("dark:bg-[rgba(26,26,26,0.85)]");
    expect(dailyPlanCard.className).toContain("dark:shadow-[0_0_30px_rgba(255,255,255,0.08),0_18px_40px_-28px_rgba(0,0,0,0.72)]");
    expect(focusCard.className).toContain("dark:bg-[rgba(26,26,26,0.85)]");
    expect(focusCard.className).toContain("supports-[backdrop-filter]:dark:backdrop-blur-md");
    expect(screen.getByRole("button", { name: "Inizia" }).className).toContain("dark:bg-[#FAFAFA]");
    expect(screen.getAllByTestId("home-minimal-artwork").length).toBeGreaterThanOrEqual(1);

    const resumeCard = screen.getByTestId("resume-lesson-card");
    expect(resumeCard).toHaveClass("bg-inverse-surface");
    expect(resumeCard).not.toHaveClass("bg-off-white");
    expect(resumeCard.className).not.toContain("dark:bg-[rgba(26,26,26,0.85)]");
  });

  it("applica lo stesso materiale dark anche allo stato vuoto del Piano del giorno", () => {
    mockDashboard({ ...dashboardData, todayTasks: [] });
    render(<HomeView {...callbacks} />);

    const dailyPlanCard = screen.getByTestId("home-daily-plan-card");
    expect(dailyPlanCard.className).toContain("dark:bg-[rgba(26,26,26,0.85)]");
    expect(screen.getByRole("button", { name: /Organizza la settimana/i }).className).toContain("dark:bg-[#FAFAFA]");
  });

  it("avvia il Pomodoro timer dalla card Focus con la durata selezionata tramite + e -", () => {
    render(<HomeView {...callbacks} />);

    expect(screen.getByText("25")).toBeInTheDocument();

    const increaseBtn = screen.getByRole("button", { name: /Aumenta di 5 minuti/i });
    fireEvent.click(increaseBtn);
    expect(screen.getByText("30")).toBeInTheDocument();

    const decreaseBtn = screen.getByRole("button", { name: /Diminuisci di 5 minuti/i });
    fireEvent.click(decreaseBtn);
    expect(screen.getByText("25")).toBeInTheDocument();

    fireEvent.click(increaseBtn);
    fireEvent.click(increaseBtn);
    expect(screen.getByText("35")).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: "Inizia" });
    fireEvent.click(startBtn);
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedDuration: 35,
        durationMinutes: 35,
        sourceType: "adhoc",
      }),
      35,
    );
  });

  it("P28: la lezione sospesa usa l'inchiostro a contrasto automatico, mai fisso", () => {
    render(<HomeView {...callbacks} />);

    const card = screen.getByTestId("resume-lesson-card");
    // Prima il testo era `text-inverse-on-surface`: nel tema scuro diventava
    // NERO sul fondo marrone/nero del blocco. Ora lo script misura il fondo
    // reale e imposta --contrast-ink sul blocco marcato.
    expect(card).toHaveAttribute("data-auto-contrast");
    expect(card.className).not.toMatch(/text-inverse-on-surface/);
    expect(card.innerHTML).not.toMatch(/text-inverse-on-surface/);
  });

  it("riapre la lezione precisa", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: /Riprendi lezione/i }));
    expect(callbacks.onResumeLesson).toHaveBeenCalledWith("ctx-1", 2);
  });

  it("avvia Focus collegandolo all'attività reale", () => {
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: /Avvia Focus per Ripasso cinematica/i }));
    expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ eventId: "e1", subject: "Fisica" }));
  });

  it("propone il caricamento quando non esistono percorsi", () => {
    mockDashboard({ ...dashboardData, resumeLesson: null, activeContextId: null, hasContexts: false, todayTasks: [] });
    render(<HomeView {...callbacks} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Aggiungi materiale/i })[0]);
    expect(callbacks.onUpload).toHaveBeenCalled();
  });
});
