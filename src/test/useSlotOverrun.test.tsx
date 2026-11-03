import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { FocusProvider, FOCUS_STORAGE_KEY, useFocus } from "@/contexts/FocusContext";
import { useSlotOverrun } from "@/hooks/useSlotOverrun";
import { PlanConflictError, type StudyEvent } from "@/hooks/useStudyEvents";
import { getStudyEventEndInstant } from "@/lib/focus/slotOverrun";
import {
  acknowledgeDeviationPromptSignal,
  getPendingDeviationSignals,
} from "@/lib/focus/deviationPrompt";

interface TestTask {
  label: string;
  subject?: string;
  eventId?: string;
  sourceType?: string;
  durationMinutes?: number;
  lessonFrom?: number;
  lessonTo?: number;
}

interface TestEndedSession {
  sessionKey: string;
  task: TestTask;
  reason: "finished" | "overrun" | "interrupted" | "auto_paused";
  endedAt: number;
  startedAt: number;
  focusSeconds: number;
  focusDurationSeconds: number;
  phase: "focus" | "short" | "medium" | "long";
}

interface TestFocus {
  isActive: boolean;
  isRunning: boolean;
  isSyncing: boolean;
  phase: "focus" | "short" | "medium" | "long";
  overrun: number;
  task: TestTask | null;
  sessionKey: string | null;
  lastEndedSession: TestEndedSession | null;
  acknowledgeEndedSession: Mock<(sessionKey: string) => void>;
  endWithReason: Mock<(reason: string) => void>;
  extendByMinutes: Mock<(minutes: number) => void>;
  startPause: Mock<() => void>;
  startSession: Mock<(task: unknown, durationMinutes?: number) => void>;
  minimize: Mock<() => void>;
}

type PlannerTestData = ReturnType<typeof plannerData>;

const mocks = vi.hoisted(() => ({
  focus: { current: null as TestFocus | null },
  useRealFocusContext: false,
  plannerData: null as PlannerTestData | null,
  applyChanges: vi.fn(),
  toggleCompleted: vi.fn(),
  refetchPlannerData: vi.fn(),
  toast: vi.fn(() => ({ id: "toast-1" })),
  dismissToast: vi.fn(),
  from: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  updatePayloads: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/contexts/FocusContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/FocusContext")>();
  return {
    ...actual,
    useOptionalFocus: () => mocks.useRealFocusContext ? actual.useOptionalFocus() : mocks.focus.current,
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: "student-1",
    session: { user: { id: "student-1" } },
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/components/focus/FocusSetupDialog", () => ({ FocusSetupDialog: () => null }));
vi.mock("@/components/focus/FocusFullscreen", () => ({ FocusFullscreen: () => null }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast, dismiss: mocks.dismissToast }),
}));
vi.mock("@/hooks/usePlannerData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/usePlannerData")>();
  return {
    ...actual,
    usePlannerSourceData: () => ({
      data: mocks.plannerData,
      isFetched: true,
      refetch: mocks.refetchPlannerData,
    }),
  };
});
vi.mock("@/hooks/useStudyEvents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useStudyEvents")>();
  return {
    ...actual,
    useApplyPlanChanges: () => ({ mutateAsync: mocks.applyChanges, isPending: false }),
    useToggleStudyEventCompleted: () => ({ mutateAsync: mocks.toggleCompleted, isPending: false }),
  };
});
vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  },
}));

const FOCUS_DURATION_SECONDS = 25 * 60;
const startAt = Date.parse("2026-11-02T09:00:00.000Z");

const activeFocusRow = {
  id: "focus-session-1",
  user_id: "student-1",
  slot_id: "study-1",
  device_id: null,
  started_at: new Date(startAt).toISOString(),
  phase: "focus",
  block_index: 0,
  phase_ends_at: new Date(startAt + FOCUS_DURATION_SECONDS * 1000).toISOString(),
  paused_at: null,
  pauses: [],
  ended_at: null,
  end_reason: null,
  version: 0,
  updated_at: new Date(startAt).toISOString(),
};

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "study-1",
    subject: "Fisica",
    title: "Ripasso",
    event_date: "2026-11-02",
    event_time: "15:00",
    end_time: "15:50",
    event_type: "study",
    source: "ai",
    status: "planned",
    is_completed: false,
    completed_at: null,
    context_id: "context-1",
    evaluation_id: null,
    lesson_from: 0,
    lesson_to: 49,
    version: 1,
    ...overrides,
  };
}

function plannerData(events: StudyEvent[] = [studyEvent()]) {
  return {
    events,
    routines: [],
    evaluations: [],
    lessonsByContext: {},
    completedByContext: {},
    readingLogs: [],
    settings: {},
    askBeforeMove: false,
    subjectOverrides: {},
    contextMetadata: {},
  };
}

function makeFocus(event: StudyEvent = studyEvent(), overrides: Partial<TestFocus> = {}): TestFocus {
  return {
    isActive: true,
    isRunning: true,
    isSyncing: false,
    phase: "focus",
    overrun: 0,
    task: { label: event.title, subject: event.subject, eventId: event.id, sourceType: "planned" },
    sessionKey: "focus-session-key",
    lastEndedSession: null,
    acknowledgeEndedSession: vi.fn<(sessionKey: string) => void>(),
    endWithReason: vi.fn<(reason: string) => void>(),
    extendByMinutes: vi.fn<(minutes: number) => void>(),
    startPause: vi.fn<() => void>(),
    startSession: vi.fn<(task: unknown, durationMinutes?: number) => void>(),
    minimize: vi.fn<() => void>(),
    ...overrides,
  };
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client = makeClient()) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

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

function FocusMonitor() {
  const focus = useFocus();
  const flow = useSlotOverrun();
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "phase" }, focus.phase),
    createElement("span", { "data-testid": "boundary" }, focus.lastBoundaryEvent?.kind ?? ""),
    createElement("div", { "aria-live": "assertive", "data-testid": "announcement" }, flow.announcement),
  );
}

async function flushRestoreEffects() {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

function endedSession(event: StudyEvent, options: {
  sessionKey?: string;
  endedAt: number;
  reason?: "finished" | "overrun" | "interrupted" | "auto_paused";
  focusSeconds?: number;
}) {
  const sessionKey = options.sessionKey ?? "ended-session";
  const focusSeconds = options.focusSeconds ?? 3 * 60;
  return {
    sessionKey,
    task: { label: event.title, subject: event.subject, eventId: event.id, sourceType: "planned" as const },
    reason: options.reason ?? "finished" as const,
    endedAt: options.endedAt,
    startedAt: options.endedAt - focusSeconds * 1000,
    focusSeconds,
    focusDurationSeconds: FOCUS_DURATION_SECONDS,
    phase: "focus" as const,
  };
}

async function mountEarlyEndedSession(event = studyEvent(), nextEvent = studyEvent({
  id: "study-2",
  subject: "Storia",
  title: "Lettura",
  event_time: "16:00",
  end_time: "16:50",
})) {
  mocks.plannerData = plannerData([event, nextEvent]);
  mocks.focus.current = makeFocus(event, {
    isActive: false,
    isRunning: false,
    sessionKey: null,
    lastEndedSession: endedSession(event, {
      endedAt: Date.parse("2026-11-02T14:03:00.000Z"),
      focusSeconds: 3 * 60,
    }),
  });
  const rendered = renderHook(() => useSlotOverrun(), { wrapper: wrapperFor() });
  await waitFor(() => expect(rendered.result.current.earlyFinish).not.toBeNull());
  return rendered;
}

beforeEach(() => {
  for (const pending of getPendingDeviationSignals()) acknowledgeDeviationPromptSignal(pending.id);
  window.localStorage.clear();
  window.sessionStorage.clear();
  mocks.focus.current = null;
  mocks.useRealFocusContext = false;
  mocks.plannerData = plannerData();
  mocks.applyChanges.mockReset().mockResolvedValue({ packageId: "package-1" });
  mocks.toggleCompleted.mockReset().mockResolvedValue({ success: true });
  mocks.refetchPlannerData.mockReset().mockResolvedValue({ data: plannerData() });
  mocks.toast.mockClear();
  mocks.dismissToast.mockClear();
  mocks.toastError.mockReset();
  mocks.toastInfo.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.updatePayloads.length = 0;
  mocks.from.mockImplementation((table: string) => queryBuilder({
    data: table === "focus_sessions" ? activeFocusRow : null,
    error: null,
  }));
});

afterEach(() => {
  cleanup();
  for (const pending of getPendingDeviationSignals()) acknowledgeDeviationPromptSignal(pending.id);
  vi.useRealTimers();
});

describe("useSlotOverrun timing and declared completion", () => {
  it("opens at DB slot end +2 minutes once per session, then stays dismissed and announces once", async () => {
    vi.useFakeTimers();
    const event = studyEvent({ event_time: "16:00", end_time: "16:50" });
    const threshold = getStudyEventEndInstant(event)! + 2 * 60_000;
    vi.setSystemTime(threshold - 1_000);
    mocks.plannerData = plannerData([event]);
    mocks.focus.current = makeFocus(event, { sessionKey: "session-open-once" });
    const announcements: string[] = [];
    const { result } = renderHook(() => {
      const flow = useSlotOverrun();
      useEffect(() => {
        if (flow.announcement) announcements.push(flow.announcement);
      }, [flow.announcement]);
      return flow;
    }, { wrapper: wrapperFor() });

    expect(result.current.open).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.open).toBe(true);
    expect(result.current.announcement).not.toBe("");
    expect(announcements).toHaveLength(1);

    act(() => result.current.dismissOverrun());
    expect(result.current.open).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * 60_000); });

    expect(result.current.open).toBe(false);
    expect(result.current.announcement).toBe("");
    expect(announcements).toHaveLength(1);
  });

  it("never opens the overrun sheet for an unplanned/free timer", async () => {
    vi.useFakeTimers();
    const event = studyEvent({ event_time: "16:00", end_time: "16:50" });
    vi.setSystemTime(getStudyEventEndInstant(event)! + 10 * 60_000);
    mocks.plannerData = plannerData([event]);
    mocks.focus.current = makeFocus(event, {
      task: { label: "Studio libero", sourceType: "adhoc" },
      sessionKey: "free-session",
    });
    const { result } = renderHook(() => useSlotOverrun(), { wrapper: wrapperFor() });

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(result.current.open).toBe(false);
    expect(result.current.announcement).toBe("");
  });

  it("does not mark an entire slot done when an ordinary Concludi sessione ends after three minutes", async () => {
    const event = studyEvent();
    mocks.plannerData = plannerData([event]);
    mocks.focus.current = makeFocus(event, {
      isActive: false,
      isRunning: false,
      sessionKey: null,
      lastEndedSession: endedSession(event, {
        endedAt: Date.parse("2026-11-02T14:03:00.000Z"),
        focusSeconds: 3 * 60,
      }),
    });

    const endedFocus = mocks.focus.current;
    const { result } = renderHook(() => useSlotOverrun(), { wrapper: wrapperFor() });
    await waitFor(() => expect(endedFocus?.acknowledgeEndedSession).toHaveBeenCalledOnce());

    expect(result.current.earlyFinish).not.toBeNull();
    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("scostamento") }));
  });

  it("marks done once when the user chooses Ho finito in the overrun sheet", async () => {
    const event = studyEvent({ event_time: "15:00", end_time: "15:50" });
    mocks.plannerData = plannerData([event]);
    const activeFocus = makeFocus(event, { overrun: 2 * 60 });
    mocks.focus.current = activeFocus;
    const { result, rerender } = renderHook(() => useSlotOverrun(), { wrapper: wrapperFor() });

    act(() => result.current.finishSession());
    expect(activeFocus.endWithReason).toHaveBeenCalledWith("overrun");

    mocks.focus.current = makeFocus(event, {
      isActive: false,
      isRunning: false,
      sessionKey: null,
      lastEndedSession: endedSession(event, {
        sessionKey: "focus-session-key",
        endedAt: Date.parse("2026-11-02T14:52:00.000Z"),
        reason: "overrun",
        focusSeconds: 50 * 60,
      }),
    });
    act(() => rerender());
    await waitFor(() => expect(mocks.applyChanges).toHaveBeenCalledOnce());
    act(() => rerender());

    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);
    expect(mocks.applyChanges).toHaveBeenCalledWith(expect.objectContaining({
      reason: "manual",
      changes: [expect.objectContaining({ op: "update", event_id: event.id, after: { lesson_to: 49, status: "done", source: "replan" } })],
    }));
  });

  it("marks an early-finished slot only after Segna come fatto is selected", async () => {
    const event = studyEvent();
    const { result } = await mountEarlyEndedSession(event);

    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.all([
        result.current.markEarlyFinishDone(),
        result.current.markEarlyFinishDone(),
      ]);
    });
    await waitFor(() => expect(result.current.earlyFinish).toBeNull());

    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
    expect(getPendingDeviationSignals()).toContainEqual(expect.objectContaining({
      id: "ended-session",
      reason: "faster",
      subject: event.subject,
      plannedMin: 50,
      actualMin: 3,
      evaluationId: null,
      contextId: event.context_id,
    }));
  });

  it("keeps the early-finish sheet open and reports a conflict without retrying the same done write", async () => {
    const { result } = await mountEarlyEndedSession(studyEvent());
    mocks.applyChanges.mockRejectedValueOnce(new PlanConflictError());

    await act(async () => { await result.current.markEarlyFinishDone(); });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Il piano è cambiato nel frattempo",
    })));

    expect(result.current.earlyFinish).not.toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(mocks.applyChanges).toHaveBeenCalledOnce();
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
  });

  it.each([
    ["Inizia la prossima", "startNextStudy"],
    ["Fai pausa", "startBreak"],
    ["Lascia libero", "leaveFree"],
  ] as const)("%s does not declare the completed slot", async (_label, action) => {
    const event = studyEvent();
    const { result } = await mountEarlyEndedSession(event);

    await act(async () => { result.current[action](); });

    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
  });
});

describe("FocusProvider auto-pause integration", () => {
  it("auto-pauses once at +30 minutes, announces the Italian message, and does not mark the slot done", async () => {
    vi.useFakeTimers();
    mocks.useRealFocusContext = true;
    const event = studyEvent({ event_time: "09:00", end_time: "09:50" });
    mocks.plannerData = plannerData([event]);
    const stored = {
      id: activeFocusRow.id,
      userId: "student-1",
      slotId: event.id,
      task: {
        label: event.title,
        subject: event.subject,
        eventId: event.id,
        sourceType: "planned",
        durationMinutes: 50,
        lessonFrom: 0,
        lessonTo: 49,
      },
      phase: "focus",
      cycle: 0,
      startedAt: startAt,
      phaseEndsAt: startAt + FOCUS_DURATION_SECONDS * 1000,
      pausedAt: null,
      pauses: [],
      version: 0,
      focusDurationSeconds: FOCUS_DURATION_SECONDS,
      phaseDurationSeconds: FOCUS_DURATION_SECONDS,
      focusSeconds: 0,
      lastAccrualAt: startAt,
    };
    window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(stored));
    vi.setSystemTime(startAt + 55 * 60_000);
    const client = makeClient();
    render(createElement(
      QueryClientProvider,
      { client },
      createElement(FocusProvider, null, createElement(FocusMonitor)),
    ));
    await flushRestoreEffects();

    await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
    await flushRestoreEffects();

    expect(mocks.updatePayloads).toContainEqual(expect.objectContaining({ end_reason: "auto_paused" }));
    expect(mocks.updatePayloads.filter((payload) => payload.end_reason === "auto_paused")).toHaveLength(1);
    expect(mocks.toastInfo).toHaveBeenCalledTimes(1);
    expect(mocks.toastInfo).toHaveBeenCalledWith("Timer in pausa: non so se stai ancora studiando.", { duration: 10_000 });
    expect(screen.getByTestId("boundary")).toHaveTextContent("ended");
    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
  });
});
