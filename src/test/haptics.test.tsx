import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeView } from "@/components/home/HomeView";
import SettingsIndex from "@/pages/settings/SettingsIndex";
import { useHomeDashboard, type HomeDashboardData } from "@/hooks/useHomeDashboard";
import { getHapticPattern, supportsHaptics, triggerHaptic } from "@/utils/haptics";

const startSession = vi.fn();
const openSetup = vi.fn();
const vibrateMock = vi.fn(() => true);

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
  resumeLesson: null,
  activeContextId: null,
  hasContexts: false,
  isGenerating: false,
  todayTasks: [],
  nextEvaluation: null,
  minutesToday: 32,
  sessionsToday: 2,
  completedActivities: 1,
  streakDays: 4,
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

function mockDashboard(data: HomeDashboardData | undefined = dashboardData) {
  vi.mocked(useHomeDashboard).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useHomeDashboard>);
}

describe("haptics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboard();
    Object.defineProperty(window.navigator, "vibrate", {
      configurable: true,
      value: vibrateMock,
    });
  });

  it("espone pattern coerenti e rileva il supporto del browser", () => {
    expect(getHapticPattern("light")).toBe(10);
    expect(getHapticPattern("medium")).toBe(25);
    expect(getHapticPattern("success")).toEqual([10, 40, 10]);
    expect(getHapticPattern("warning")).toEqual([30, 50, 30]);
    expect(getHapticPattern("error")).toEqual([30, 50, 30]);
    expect(supportsHaptics()).toBe(true);
  });

  it("fallisce in silenzio quando navigator.vibrate non è disponibile", () => {
    Object.defineProperty(window.navigator, "vibrate", {
      configurable: true,
      value: undefined,
    });

    expect(supportsHaptics()).toBe(false);
    expect(triggerHaptic("light")).toBe(false);
  });

  it("applica feedback light ai menu impostazioni", () => {
    render(
      <MemoryRouter>
        <SettingsIndex />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: /Generale/i }));
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it("applica feedback medium ai controlli del Focus Timer", () => {
    render(<HomeView {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: /Aumenta di 5 minuti/i }));
    fireEvent.click(screen.getByRole("button", { name: "Inizia" }));

    expect(vibrateMock).toHaveBeenNthCalledWith(1, 25);
    expect(vibrateMock).toHaveBeenNthCalledWith(2, 25);
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedDuration: 30,
        durationMinutes: 30,
        sourceType: "adhoc",
      }),
      30,
    );
  });

  it("applica feedback light alle CTA del Piano del giorno", () => {
    render(<HomeView {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: /Organizza la settimana/i }));

    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(callbacks.onOpenPlan).toHaveBeenCalled();
  });
});
