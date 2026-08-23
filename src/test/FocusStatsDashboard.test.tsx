import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusStatsDashboard } from "@/components/focus/FocusStatsDashboard";
import { useHomeDashboard, type HomeDashboardData } from "@/hooks/useHomeDashboard";

const openSetup = vi.fn();

vi.mock("@/hooks/useHomeDashboard", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useHomeDashboard")>("@/hooks/useHomeDashboard");
  return { ...actual, useHomeDashboard: vi.fn() };
});

vi.mock("@/contexts/FocusContext", () => ({
  useFocus: () => ({ openSetup }),
}));

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: ReactNode }) => <svg data-testid="focus-area-chart">{children}</svg>,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

function datedSession(id: string, daysAgo: number, duration: number, taskLabel = "Ripasso cinematica") {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(14, 30, 0, 0);

  return {
    id,
    actualDuration: duration,
    completedAt: date.toISOString(),
    subjectName: "Fisica",
    taskLabel,
  };
}

const dashboardData: HomeDashboardData = {
  displayName: "Vale",
  resumeLesson: null,
  activeContextId: null,
  hasContexts: false,
  isGenerating: false,
  todayTasks: [],
  nextEvaluation: null,
  minutesToday: 32,
  sessionsToday: 2,
  completedActivities: 0,
  streakDays: 4,
  focusSessions: [
    datedSession("focus-today", 0, 32),
    datedSession("focus-two", 2, 25, "Esercizi sulle derivate"),
  ],
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

describe("FocusStatsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboard();
  });

  it("mostra la serie al centro e trasforma le sessioni reali in dashboard", () => {
    render(<FocusStatsDashboard />);

    expect(screen.getByTestId("streak-emblem")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("heading", { name: "4 giorni di serie" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Oggi" })).getByText("32 min")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Focus nel tempo" })).toBeInTheDocument();
    expect(screen.getByTestId("focus-area-chart")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ultime sessioni" })).toBeInTheDocument();
    expect(screen.getByText("Ripasso cinematica")).toBeInTheDocument();
  });

  it("permette di cambiare il periodo senza trasformare i controlli in semplici div", () => {
    render(<FocusStatsDashboard />);

    const sevenDays = screen.getByRole("button", { name: "7 giorni" });
    expect(sevenDays).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(sevenDays);
    expect(sevenDays).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30 giorni" })).toHaveAttribute("aria-pressed", "false");
  });

  it("offre Focus come uscita utile quando non ci sono ancora dati", () => {
    mockDashboard({ ...dashboardData, minutesToday: 0, sessionsToday: 0, streakDays: 0, focusSessions: [] });
    render(<FocusStatsDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Avvia Focus" }));
    expect(openSetup).toHaveBeenCalledTimes(1);
  });
});
