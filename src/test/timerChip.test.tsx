import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimerChip } from "@/components/focus/TimerChip";

const mocks = vi.hoisted(() => ({
  focus: {
    isActive: true,
    isFullscreen: false,
    isRunning: true,
    isSyncing: false,
    phase: "focus",
    cycle: 0,
    remaining: 18 * 60 + 42,
    overrun: 0,
    phaseDurationSeconds: 25 * 60,
    task: { label: "Ripasso cinematica", subject: "Biologia", lessonFrom: 0, lessonTo: 6 },
    awaitingChoice: false,
    announcement: "",
    openSetup: vi.fn(),
    openFullscreen: vi.fn(),
    minimize: vi.fn(),
    toggleRun: vi.fn(),
    restart: vi.fn(),
    end: vi.fn(),
    endWithReason: vi.fn(),
    startSession: vi.fn(),
    extend: vi.fn(),
    addFiveMinutes: vi.fn(),
    nextPhase: vi.fn(),
  },
}));

vi.mock("@/contexts/FocusContext", () => ({
  useOptionalFocus: () => mocks.focus,
  useFocus: () => mocks.focus,
  formatMMSS: (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  },
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  act(() => fireEvent(window, new Event("resize")));
}

beforeEach(() => {
  mocks.focus.isActive = true;
  mocks.focus.isRunning = true;
  mocks.focus.isSyncing = false;
  mocks.focus.remaining = 18 * 60 + 42;
  mocks.focus.overrun = 0;
  mocks.focus.announcement = "";
  mocks.focus.task = { label: "Ripasso cinematica", subject: "Biologia", lessonFrom: 0, lessonTo: 6 };
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TimerChip responsive", () => {
  it("a 390px mostra timer compatto e pausa interna", () => {
    render(<TimerChip />);

    expect(screen.getByTestId("timer-chip")).toHaveClass("w-[7rem]");
    expect(screen.getByTestId("timer-chip-pause")).toBeInTheDocument();
    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("18:42");
  });

  it("a 360px non mostra il pulsante pausa interno", () => {
    setViewportWidth(360);
    render(<TimerChip />);

    expect(screen.getByTestId("timer-chip-trigger")).toHaveAttribute("data-layout", "compact");
    expect(screen.queryByTestId("timer-chip-pause")).not.toBeInTheDocument();
    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("18:42");
  });

  it("a 320px mostra soltanto l'anello da 44px con i minuti", () => {
    setViewportWidth(320);
    render(<TimerChip />);

    expect(screen.getByTestId("timer-chip-trigger")).toHaveAttribute("data-layout", "ring");
    expect(screen.getByTestId("timer-ring-only")).toBeInTheDocument();
    expect(screen.getByTestId("timer-ring-only")).toHaveTextContent("19");
    expect(screen.queryByTestId("timer-chip-pause")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timer-countdown")).not.toBeInTheDocument();
    expect(screen.getByTestId("timer-ring-only")).toHaveClass("h-11", "w-11");
  });

  it("non rende il conto alla rovescia una live region", () => {
    render(<TimerChip />);
    const countdown = screen.getByTestId("timer-countdown");

    expect(countdown).not.toHaveAttribute("aria-live");
    expect(countdown).not.toHaveAttribute("role", "status");
    expect(countdown.closest("[aria-live]")).toBeNull();
    expect(screen.getByTestId("timer-announcements")).toHaveAttribute("aria-live", "assertive");
  });

  it("include materia e tempo nel nome accessibile completo", () => {
    render(<TimerChip />);
    expect(screen.getByRole("button", { name: /Biologia: Ripasso cinematica.*18:42/ })).toBeInTheDocument();
  });

  it("apre lo Sheet mobile con dettagli e controlli, poi chiede conferma prima di interrompere", () => {
    render(<TimerChip />);
    fireEvent.click(screen.getByTestId("timer-chip-trigger"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Minilezioni 1–7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Metti in pausa il timer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+5 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ho finito" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Interrompi" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Interrompi sessione" }));
    expect(mocks.focus.endWithReason).toHaveBeenCalledWith("interrupted");
  });
});
