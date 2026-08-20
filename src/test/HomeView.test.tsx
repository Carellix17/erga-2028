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

  it("mostra dati reali del dashboard", () => {
    render(<HomeView {...callbacks} />);

    expect(screen.getByText("Vale")).toBeInTheDocument();
    expect(screen.getByText("Il moto rettilineo")).toBeInTheDocument();
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
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
