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

  it("applica feedback light agli strumenti rapidi della Home", () => {
    render(<HomeView {...callbacks} />);

    // Strumento rapido "Carica materiale": feedback light + azione di upload
    fireEvent.click(screen.getByText("Carica materiale"));
    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(callbacks.onUpload).toHaveBeenCalled();
  });

  it("applica feedback light alle CTA del piano del giorno", () => {
    render(<HomeView {...callbacks} />);

    // Stato vuoto: la CTA "Organizza la settimana" porta al Piano con feedback light
    fireEvent.click(screen.getByText(/organizza la settimana/i));
    expect(vibrateMock).toHaveBeenCalledWith(10);
    expect(callbacks.onOpenPlan).toHaveBeenCalled();
  });
});
