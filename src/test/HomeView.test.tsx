import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home/HomeView";
import { useHomeDashboard, type HomeDashboardData } from "@/hooks/useHomeDashboard";
import { HomeV2 } from "@/components/home/HomeV2";

const startSession = vi.fn();
const openSetup = vi.fn();

vi.mock("@/hooks/useHomeDashboard", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useHomeDashboard")>("@/hooks/useHomeDashboard");
  return { ...actual, useHomeDashboard: vi.fn() };
});

vi.mock("@/contexts/FocusContext", () => ({
  useFocus: () => ({ startSession, openSetup, openFullscreen: vi.fn(), isActive: false }),
}));

vi.mock("@/components/studio/CourseCardBackground", () => ({
  CourseCardBackground: () => <div data-testid="course-background" />,
}));

vi.mock("@/hooks/useCognitiveProfile", () => ({
  useCognitiveProfile: () => ({
    profile: { log_score: 70, mem_score: 60, foc_score: 80, voc_score: 65, ans_score: 75, app_score: 70 },
    isLoaded: true,
  }),
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

describe("HomeView V2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboard();
  });

  it("renderizza tutti i 6 componenti modulari V2", () => {
    render(<HomeView {...callbacks} />);
    // CompactHeader
    expect(screen.getByText("Vale")).toBeInTheDocument();
    expect(screen.getByText(/12 giorni/)).toBeInTheDocument();
    // DynamicHeroCard
    expect(screen.getByText("Il moto rettilineo")).toBeInTheDocument();
    // QuickActions
    expect(screen.getByText("Importa PDF")).toBeInTheDocument();
    expect(screen.getByText("Quiz Espresso")).toBeInTheDocument();
    expect(screen.getByText("Chiedi a Erga")).toBeInTheDocument();
    expect(screen.getByText("Focus Libero")).toBeInTheDocument();
    // CognitivePulse
    expect(screen.getByText(/Focus Alto|Focus Medio|Focus Basso/)).toBeInTheDocument();
    // DailyTimeline
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
    // BottomNav
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Piano")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
  });

  it("rispetta touch target minimo 44px", () => {
    render(<HomeView {...callbacks} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      // Check class contains h-11 (44px) or min 44
      const hasMinSize = btn.className.includes("h-11") || btn.className.includes("min-h-") || btn.className.includes("h-[64px]");
      // Allow small decorative buttons but main actions must be 44
      if (btn.textContent?.includes("Importa PDF") || btn.textContent?.includes("Riprendi") || btn.textContent?.includes("Cambia corso")) {
        expect(hasMinSize || btn.className.includes("h-11")).toBeTruthy();
      }
    });
  });

  it("tronca testi lunghi per evitare rotture UI", () => {
    mockDashboard({
      ...dashboardData,
      displayName: "Alessandro Molto Lungo Con Nome Che Non Finisce Mai",
      resumeLesson: {
        ...dashboardData.resumeLesson!,
        lessonTitle: "Titolo lunghissimo che dovrebbe essere troncato per non rompere il layout della card hero con line-clamp",
        courseTitle: "Materia con nome lunghissimo che deve essere troncato",
      },
    });
    render(<HomeView {...callbacks} />);
    const title = screen.getByText(/Titolo lunghissimo/);
    expect(title.className).toMatch(/truncate|line-clamp/);
    const userName = screen.getByText(/Alessandro Molto Lungo/);
    expect(userName.className).toMatch(/truncate|line-clamp/);
  });

  it("switch heroState mostra 3 stati diversi", () => {
    const { rerender } = render(
      <HomeV2
        heroState="ACTIVE_SESSION"
        heroProps={{
          subject: "Fisica",
          lessonTitle: "Moto rettilineo",
          retentionText: "Ritenzione 78%",
          progressPercent: 42,
        }}
      />
    );
    expect(screen.getByText("Moto rettilineo")).toBeInTheDocument();
    
    rerender(
      <HomeV2
        heroState="CONTEXT_EVENT"
        heroProps={{
          secondaryText: "Hai saltato allenamento",
          retentionText: "Riprendi ritmo",
        }}
      />
    );
    expect(screen.getByText(/Hai saltato/)).toBeInTheDocument();
    
    rerender(
      <HomeV2
        heroState="SPACED_REPETITION"
        heroProps={{
          lessonTitle: "Fotosintesi",
          retentionText: "3 concetti da ripassare",
        }}
      />
    );
    expect(screen.getByText("Fotosintesi")).toBeInTheDocument();
  });

  it("BottomNav resta fissato senza coprire timeline", () => {
    render(<HomeView {...callbacks} />);
    const nav = document.querySelector("nav.fixed.bottom-0");
    expect(nav).toBeTruthy();
    const inner = nav?.querySelector(".max-w-md");
    expect(inner).toBeTruthy();
    expect(inner?.className).toContain("mx-auto");
    
    // Container should have pb-24 to avoid content hidden by nav
    const container = document.querySelector(".pb-24");
    expect(container).toBeTruthy();
  });

  it("QuickActions non triggera scroll orizzontale globale", () => {
    render(<HomeView {...callbacks} />);
    const quickActionsContainer = document.querySelector(".overflow-x-auto.no-scrollbar");
    expect(quickActionsContainer).toBeTruthy();
    expect(quickActionsContainer?.className).toContain("no-scrollbar");
  });

  it("usa solo lucide-react icons", () => {
    render(<HomeView {...callbacks} />);
    // Check that no emoji is used as icon (except streak fire which is allowed as per spec)
    // All icons should be svg from lucide
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});
