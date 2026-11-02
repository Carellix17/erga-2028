import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusProvider, FOCUS_STORAGE_KEY, formatMMSS, useFocus } from "@/contexts/FocusContext";
import {
  fromStoredPhase,
  nextPhase,
  overrun,
  pause,
  remaining,
  resume,
  start,
  toStoredPhase,
} from "@/lib/focusClock";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  updatePayloads: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ session: { user: { id: "student-1" } } }) }));
vi.mock("@/components/focus/FocusSetupDialog", () => ({ FocusSetupDialog: () => null }));
vi.mock("@/components/focus/FocusFullscreen", () => ({ FocusFullscreen: () => null }));
vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  },
}));

const FOCUS_DURATION = 25 * 60;
const startAt = Date.parse("2026-11-02T09:00:00.000Z");
const activeRow = {
  id: "focus-session-1",
  user_id: "student-1",
  slot_id: "study-slot-1",
  device_id: null,
  started_at: new Date(startAt).toISOString(),
  phase: "focus",
  block_index: 0,
  phase_ends_at: new Date(startAt + FOCUS_DURATION * 1000).toISOString(),
  paused_at: null,
  pauses: [],
  ended_at: null,
  end_reason: null,
  version: 0,
  updated_at: new Date(startAt).toISOString(),
};

function queryBuilder(result: { data: unknown; error: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "limit", "insert"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    mocks.updatePayloads.push(payload);
    return builder;
  });
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  return builder;
}

function ClockProbe() {
  const focus = useFocus();
  return createElement("span", { "data-testid": "remaining" }, formatMMSS(focus.remaining));
}

function renderClock() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(createElement(
    QueryClientProvider,
    { client },
    createElement(FocusProvider, null, createElement(ClockProbe)),
  ));
  return { client, ...view };
}

async function flushRestoreEffects() {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.toastError.mockReset();
  mocks.toastInfo.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.updatePayloads.length = 0;
  mocks.from.mockImplementation((table: string) => queryBuilder({
    data: table === "focus_sessions" ? activeRow : null,
    error: null,
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("focusClock", () => {
  it("uses absolute time, so ten minutes without a tick leave exactly fifteen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(startAt);
    const timer = start(Date.now(), FOCUS_DURATION);

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(remaining(Date.now(), timer.phaseEndsAt, null)).toBe(15 * 60);
  });

  it("freezes while paused and shifts the deadline by the full three-minute pause", () => {
    vi.useFakeTimers();
    vi.setSystemTime(startAt);
    const timer = start(Date.now(), FOCUS_DURATION);
    vi.advanceTimersByTime(7 * 60 * 1000);
    const paused = pause(Date.now());
    expect(remaining(Date.now(), timer.phaseEndsAt, paused.pausedAt)).toBe(18 * 60);

    vi.advanceTimersByTime(3 * 60 * 1000);
    const resumed = resume(Date.now(), timer.phaseEndsAt, paused.pausedAt);

    expect(resumed.phaseEndsAt).toBe(timer.phaseEndsAt + 3 * 60 * 1000);
    expect(resumed.pausedAt).toBeNull();
    expect(remaining(Date.now(), resumed.phaseEndsAt, null)).toBe(18 * 60);
  });

  it("uses short, medium and long settings while preserving the four-block cycle", () => {
    const durations = { short: 5, medium: 10, long: 20 };
    const first = nextPhase("focus", 0, startAt, durations, FOCUS_DURATION);
    const second = nextPhase("focus", first.blockIndex, startAt, durations, FOCUS_DURATION);
    const third = nextPhase("focus", second.blockIndex, startAt, durations, FOCUS_DURATION);
    const fourth = nextPhase("focus", third.blockIndex, startAt, durations, FOCUS_DURATION);
    const afterBreak = nextPhase(fourth.phase, fourth.blockIndex, startAt, durations, FOCUS_DURATION);

    expect(first).toMatchObject({ phase: "short", blockIndex: 1, phaseDurationSeconds: 300, breakKind: "short" });
    expect(second).toMatchObject({ phase: "short", blockIndex: 2, phaseDurationSeconds: 600, breakKind: "medium" });
    expect(third).toMatchObject({ phase: "short", blockIndex: 3, phaseDurationSeconds: 300, breakKind: "short" });
    expect(fourth).toMatchObject({ phase: "long", blockIndex: 4, phaseDurationSeconds: 1200, breakKind: "long" });
    expect(afterBreak).toMatchObject({ phase: "focus", blockIndex: 4, phaseDurationSeconds: FOCUS_DURATION });
    expect(toStoredPhase(second.phase)).toBe("short_break");
    expect(fromStoredPhase("short_break")).toBe("short");
  });

  it("counts overtime against the same absolute phase deadline", () => {
    const timer = start(startAt, 60);
    expect(overrun(startAt + 60_000 + 35_000, timer.phaseEndsAt, null)).toBe(35);
    expect(remaining(startAt + 60_000 + 35_000, timer.phaseEndsAt, null)).toBe(0);
  });

  it("auto-pauses after thirty minutes of overtime even when the page was reloaded late", async () => {
    vi.useFakeTimers();
    const stored = {
      id: activeRow.id,
      userId: "student-1",
      slotId: activeRow.slot_id,
      task: { label: "Ripasso cinematica", subject: "Fisica", eventId: activeRow.slot_id },
      phase: "focus",
      cycle: 0,
      startedAt: startAt,
      phaseEndsAt: startAt + FOCUS_DURATION * 1000,
      pausedAt: null,
      pauses: [],
      version: 0,
      focusDurationSeconds: FOCUS_DURATION,
      phaseDurationSeconds: FOCUS_DURATION,
      focusSeconds: 0,
      lastAccrualAt: startAt,
    };
    window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(stored));
    vi.setSystemTime(startAt + 55 * 60 * 1000);
    renderClock();
    await flushRestoreEffects();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_100);
    });

    expect(mocks.updatePayloads).toContainEqual(expect.objectContaining({
      end_reason: "auto_paused",
      ended_at: expect.any(String),
    }));
  });

  it("restores the same absolute countdown after a fresh provider mount", async () => {
    vi.useFakeTimers();
    const stored = {
      id: activeRow.id,
      userId: "student-1",
      slotId: activeRow.slot_id,
      task: {
        label: "Ripasso cinematica",
        subject: "Fisica",
        eventId: activeRow.slot_id,
        sourceType: "planned",
        durationMinutes: 25,
        lessonFrom: 0,
        lessonTo: 6,
      },
      phase: "focus",
      cycle: 0,
      startedAt: startAt,
      phaseEndsAt: startAt + FOCUS_DURATION * 1000,
      pausedAt: null,
      pauses: [],
      version: 0,
      focusDurationSeconds: FOCUS_DURATION,
      phaseDurationSeconds: FOCUS_DURATION,
      focusSeconds: 0,
      lastAccrualAt: startAt,
    };
    window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(stored));
    vi.setSystemTime(startAt + 10 * 60 * 1000);

    const firstMount = renderClock();
    await flushRestoreEffects();
    expect(screen.getByTestId("remaining")).toHaveTextContent("15:00");
    firstMount.unmount();

    vi.setSystemTime(startAt + 12 * 60 * 1000);
    renderClock();
    await flushRestoreEffects();

    expect(screen.getByTestId("remaining")).toHaveTextContent("13:00");
    expect(mocks.from).toHaveBeenCalledWith("focus_sessions");
    expect(mocks.from).toHaveBeenCalledWith("planner_settings");
  });
});
