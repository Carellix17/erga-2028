import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { PianoView } from "@/components/piano/PianoView";
import { ReplanBanner } from "@/components/piano/ReplanBanner";
import { useDeviationPrompt } from "@/hooks/useDeviationPrompt";
import { useSlotOverrun } from "@/hooks/useSlotOverrun";
import type { PlannerData, PlannerInputOptions } from "@/hooks/usePlannerData";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { BuildPlanInput, ScheduleEvaluation, ScheduledSlot } from "@/lib/planner/schedule";
import {
  acknowledgeDeviationPromptSignal,
  emitDeviationPromptSignal,
  getPendingDeviationSignals,
  type DeviationPromptSignal,
} from "@/lib/focus/deviationPrompt";

const mocks = vi.hoisted(() => ({
  focus: null as unknown,
  plannerData: null as unknown,
  events: [] as unknown[],
  generatedSlots: [] as unknown[],
  buildPlan: vi.fn(),
  estimateFn: vi.fn(() => 20),
  applyChanges: vi.fn(),
  toggleCompleted: vi.fn(),
  refetchEvents: vi.fn(),
  refetchPlannerData: vi.fn(),
  insertPlannerEvent: vi.fn(),
  telemetry: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  toast: vi.fn(() => ({ id: "planner-toast" })),
  dismissToast: vi.fn(),
  onPreview: vi.fn(),
  previewChanges: [] as unknown[],
}));

vi.mock("@/contexts/FocusContext", () => ({
  useOptionalFocus: () => mocks.focus,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: "student-1", session: { user: { id: "student-1" } } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => mocks.insertPlannerEvent(table, payload),
    }),
  },
}));
vi.mock("@/hooks/usePlannerData", () => ({
  usePlannerData: () => ({
    data: mocks.plannerData,
    isLoading: false,
    isError: false,
    refetch: mocks.refetchPlannerData,
  }),
  usePlannerSourceData: () => ({
    data: mocks.plannerData,
    isFetched: true,
    refetch: mocks.refetchPlannerData,
  }),
  plannerDataKeys: { all: (userId: string | null) => ["planner-data", userId] },
}));
vi.mock("@/hooks/useStudyEvents", () => ({
  studyEventsKeys: { all: (userId: string | null) => ["study-events", userId] },
  PlanConflictError: class PlanConflictError extends Error {},
  useStudyEventsQuery: () => ({
    data: mocks.events,
    isLoading: false,
    isError: false,
    refetch: mocks.refetchEvents,
  }),
  useAddStudyEvents: () => ({ mutateAsync: vi.fn() }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
  useApplyPlanChanges: () => ({ mutateAsync: mocks.applyChanges, isPending: false }),
  useToggleStudyEventCompleted: () => ({ mutateAsync: mocks.toggleCompleted, isPending: false }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluation: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleEvaluationCompleted: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useUserRoutines", () => ({ useUserRoutines: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/useAutoReplan", () => ({
  useAutoReplan: () => ({ handleKeep: vi.fn(), handleSplit: vi.fn() }),
}));
vi.mock("@/hooks/usePlanChanges", () => ({
  planChangesKeys: { all: (userId: string | null) => ["plan-changes", userId] },
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast, dismiss: mocks.dismissToast }),
}));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/utils/haptics", () => ({ triggerHaptic: vi.fn() }));
vi.mock("@/components/piano/AppointmentsCalendar", () => ({ AppointmentsCalendar: () => null }));
vi.mock("@/components/piano/AddEventSheet", () => ({ AddEventSheet: () => null }));
vi.mock("@/components/piano/EditStudyEventSheet", () => ({ EditStudyEventSheet: () => null }));
vi.mock("@/components/piano/PlanHistory", () => ({ PlanHistory: () => null }));
vi.mock("@/components/piano/NoSpaceDialog", () => ({ NoSpaceDialog: () => null }));
vi.mock("@/components/piano/ChangePreview", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    ChangePreview: ({ open, changes, onApply }: {
      open: boolean;
      changes: unknown[];
      onApply: (changes: unknown[]) => Promise<void> | void;
    }) => {
      mocks.previewChanges = changes;
      return open ? React.createElement(
        "div",
        { role: "dialog", "aria-label": "Anteprima delle modifiche" },
        React.createElement("button", { type: "button", onClick: () => { void onApply(changes); } }, "Conferma proposta"),
      ) : null;
    },
  };
});
vi.mock("@/lib/planner/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/planner/schedule")>();
  return {
    ...actual,
    buildPlan: (input: BuildPlanInput) => mocks.buildPlan(input),
  };
});

const STORAGE_KEY = "erga:replan-dismissed:v1";
const FIXED_NOW = Date.parse("2026-11-03T10:00:00.000Z");

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "slot-1",
    subject: "Biologia",
    title: "Biologia · lezioni 1–3",
    event_date: "2026-11-04",
    event_time: "14:00",
    end_time: "15:30",
    event_type: "study",
    status: "planned",
    is_completed: false,
    context_id: "context-1",
    evaluation_id: "evaluation-1",
    lesson_from: 1,
    lesson_to: 3,
    source: "auto",
    locked: false,
    move_count: 0,
    version: 7,
    ...overrides,
  };
}

function scheduleSlot(event: StudyEvent): ScheduledSlot {
  return {
    event_date: event.event_date,
    event_time: event.event_time ?? "14:00",
    end_time: event.end_time ?? "15:30",
    context_id: event.context_id ?? null,
    lesson_from: event.lesson_from ?? null,
    lesson_to: event.lesson_to ?? null,
    evaluation_id: event.evaluation_id ?? "evaluation-1",
    source: "auto",
    subject: event.subject,
    title: event.title,
  };
}

function movedScheduleSlot(): ScheduledSlot {
  return {
    ...scheduleSlot(studyEvent()),
    event_time: "16:00",
    end_time: "17:30",
  };
}

function evaluation(): ScheduleEvaluation {
  return {
    id: "evaluation-1",
    title: "Verifica di Biologia",
    date: "2026-11-10",
    is_completed: false,
    topic_type: "linked",
    topic_id: "context-1",
    subject_id: "subject-1",
    subject: "Biologia",
  };
}

function makePlannerData(events: StudyEvent[] = [studyEvent()]): PlannerData {
  const evaluations = [evaluation()];
  return {
    routines: [],
    events: events as unknown as PlannerData["events"],
    evaluations,
    lessonsByContext: {},
    completedByContext: {},
    readingLogs: [],
    settings: {},
    askBeforeMove: false,
    subjectOverrides: {},
    contextMetadata: {},
    buildPlanInput: (options: PlannerInputOptions = {}): BuildPlanInput => ({
      today: options.today ?? new Date(),
      horizonDays: options.horizonDays ?? 30,
      evaluations: options.evaluations ?? evaluations,
      lessonsByContext: {},
      completedByContext: {},
      estimateFn: mocks.estimateFn,
      routines: [],
      busyEvents: events,
      existingSlots: [],
      settings: {},
    }),
  };
}

function signal(overrides: Partial<DeviationPromptSignal> = {}): DeviationPromptSignal {
  return {
    id: "session-1",
    userId: "student-1",
    reason: "slower",
    subject: "Biologia",
    plannedMin: 90,
    actualMin: 110,
    evaluationId: "evaluation-1",
    contextId: "context-1",
    createdAt: Date.now(),
    ...overrides,
  };
}

function PromptHarness({ blocked = false }: { blocked?: boolean }) {
  const flow = useDeviationPrompt({
    plannerData: mocks.plannerData as PlannerData,
    events: mocks.events as StudyEvent[],
    blocked,
    onPreview: mocks.onPreview,
  });
  return createElement(ReplanBanner, {
    prompt: flow.prompt,
    notice: flow.notice,
    isBuilding: flow.isBuilding,
    onShown: flow.onShown,
    onReorganize: flow.reorganize,
    onLater: flow.dismissLater,
  });
}

function PianoHarness({ strict = false }: { strict?: boolean }) {
  const content = createElement(PianoView, { hasFiles: true, onUploadClick: vi.fn() });
  return strict ? createElement(StrictMode, null, content) : content;
}

function renderPiano(strict = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client },
      createElement(MemoryRouter, { initialEntries: ["/app?tab=piano"] },
        createElement(PianoHarness, { strict }),
      ),
    ),
  );
}

function ActiveFocus(sessionKey: string) {
  return {
    isActive: true,
    isRunning: true,
    isSyncing: false,
    phase: "focus",
    isBreak: false,
    overrun: 0,
    task: { label: "Biologia", subject: "Biologia", eventId: "slot-1", sourceType: "planned" },
    sessionKey,
    lastEndedSession: null,
    lastBoundaryEvent: null,
    endWithReason: vi.fn(),
    acknowledgeEndedSession: vi.fn(),
  };
}

function EndedFocus(sessionKey: string, endedAt = Date.parse("2026-11-04T14:31:00.000Z")) {
  return {
    isActive: false,
    isRunning: false,
    isSyncing: false,
    phase: "focus",
    isBreak: false,
    overrun: 0,
    task: null,
    sessionKey: null,
    lastEndedSession: {
      sessionKey,
      task: { label: "Biologia", subject: "Biologia", eventId: "slot-1", sourceType: "planned" },
      reason: "finished",
      endedAt,
      startedAt: FIXED_NOW,
      focusSeconds: 110 * 60,
      focusDurationSeconds: 90 * 60,
      phase: "focus",
    },
    lastBoundaryEvent: { id: `${sessionKey}:ended`, sessionKey, kind: "ended", phase: "focus", at: endedAt },
    acknowledgeEndedSession: vi.fn(),
    endWithReason: vi.fn(),
  };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
  await i18n.changeLanguage("it");
  localStorage.clear();
  sessionStorage.clear();
  mocks.focus = null;
  mocks.events = [studyEvent()];
  mocks.plannerData = makePlannerData(mocks.events as StudyEvent[]);
  mocks.generatedSlots = [movedScheduleSlot()];
  mocks.buildPlan.mockReset();
  mocks.buildPlan.mockImplementation(() => ({ slots: mocks.generatedSlots, warnings: [] }));
  mocks.estimateFn.mockClear();
  mocks.applyChanges.mockReset();
  mocks.applyChanges.mockResolvedValue(undefined);
  mocks.toggleCompleted.mockReset();
  mocks.refetchEvents.mockReset();
  mocks.refetchEvents.mockResolvedValue({ data: mocks.events });
  mocks.refetchPlannerData.mockReset();
  mocks.refetchPlannerData.mockResolvedValue({ data: mocks.plannerData });
  mocks.insertPlannerEvent.mockReset();
  mocks.insertPlannerEvent.mockImplementation(async (table: string, payload: Record<string, unknown>) => {
    mocks.telemetry.push({ table, payload });
    return { error: null };
  });
  mocks.telemetry.length = 0;
  mocks.toast.mockClear();
  mocks.dismissToast.mockClear();
  mocks.onPreview.mockReset();
  mocks.previewChanges = [];
});

afterEach(() => {
  cleanup();
  for (const pending of getPendingDeviationSignals()) acknowledgeDeviationPromptSignal(pending.id);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("deviation replan prompt", () => {
  it("holds the prompt throughout a focus block and shows it at the pause boundary", () => {
    const deviation = signal();
    mocks.focus = ActiveFocus(deviation.id);
    const view = render(createElement(PromptHarness));

    act(() => emitDeviationPromptSignal(deviation));
    expect(screen.queryByTestId("replan-banner")).not.toBeInTheDocument();
    expect(mocks.telemetry).toHaveLength(0);

    mocks.focus = {
      ...ActiveFocus(deviation.id),
      phase: "short",
      lastBoundaryEvent: {
        id: `${deviation.id}:pause:short`,
        sessionKey: deviation.id,
        kind: "pause",
        phase: "short",
        at: Date.now(),
      },
    };
    view.rerender(createElement(PromptHarness));

    expect(screen.getByTestId("replan-banner")).toHaveTextContent(
      "Oggi hai studiato Biologia più lentamente del previsto (1 h 50 invece di 1 h 30). Vuoi riorganizzare?",
    );
    expect(mocks.telemetry).toHaveLength(1);
    expect(mocks.telemetry[0]).toEqual({
      table: "planner_events",
      payload: {
        user_id: "student-1",
        name: "replan_shown",
        props: { reason: "slower", rows: 1 },
      },
    });
    expect(JSON.stringify(mocks.telemetry[0].payload.props).length).toBeLessThanOrEqual(512);
  });

  it("snoozes the same reason and day for 24 hours and keeps storage content minimal", () => {
    const first = signal({ id: "snooze-first" });
    render(createElement(PromptHarness));
    act(() => emitDeviationPromptSignal(first));

    fireEvent.click(screen.getByRole("button", { name: "Più tardi" }));
    expect(screen.queryByTestId("replan-banner")).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Record<string, unknown>;
    expect(stored).toEqual({
      key: "slower:2026-11-03",
      reason: "slower",
      timestamp: FIXED_NOW,
    });
    expect(Object.keys(stored).sort()).toEqual(["key", "reason", "timestamp"]);
    expect(mocks.telemetry.at(-1)).toEqual({
      table: "planner_events",
      payload: { user_id: "student-1", name: "replan_rejected", props: { reason: "slower", rows: 1 } },
    });

    vi.setSystemTime(FIXED_NOW + 23 * 60 * 60 * 1000);
    act(() => emitDeviationPromptSignal(signal({ id: "snooze-before-expiry", createdAt: first.createdAt })));
    expect(screen.queryByTestId("replan-banner")).not.toBeInTheDocument();

    vi.setSystemTime(FIXED_NOW + 24 * 60 * 60 * 1000 + 1);
    act(() => emitDeviationPromptSignal(signal({ id: "snooze-after-expiry", createdAt: first.createdAt })));
    expect(screen.getByTestId("replan-banner")).toBeVisible();
  });

  it("prepares only a preview, then applies one versioned package after confirmation in StrictMode", async () => {
    const event = studyEvent();
    mocks.events = [event];
    mocks.plannerData = makePlannerData([event]);
    mocks.focus = EndedFocus("confirmed-session");
    renderPiano(true);
    act(() => emitDeviationPromptSignal(signal({ id: "confirmed-session" })));

    fireEvent.click(screen.getByRole("button", { name: "Vediamo" }));
    expect(await screen.findByRole("dialog", { name: "Anteprima delle modifiche" })).toBeVisible();
    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(mocks.previewChanges).toHaveLength(1);
    expect(mocks.buildPlan).toHaveBeenCalledTimes(1);
    const planInput = mocks.buildPlan.mock.calls[0][0] as BuildPlanInput;
    expect(planInput.horizonDays).toBe(30);
    expect(planInput.evaluations.map((item) => item.id)).toEqual(["evaluation-1"]);
    expect(planInput.estimateFn).toBe(mocks.estimateFn);

    let resolveApply: ((value: unknown) => void) | undefined;
    mocks.applyChanges.mockImplementationOnce(() => new Promise((resolve) => { resolveApply = resolve; }));
    const confirm = screen.getByRole("button", { name: "Conferma proposta" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);
    const request = mocks.applyChanges.mock.calls[0][0] as {
      reason: string;
      changes: Array<Record<string, unknown>>;
    };
    expect(request.reason).toBe("overrun");
    expect(request.changes).toHaveLength(1);
    expect(request.changes[0]).toMatchObject({ op: "update", event_id: "slot-1", version: 7 });

    await act(async () => {
      resolveApply?.(undefined);
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.telemetry.filter((item) => item.payload.name === "replan_shown")).toHaveLength(1);
  });

  it("shows the no-change message without opening a preview", () => {
    const event = studyEvent();
    mocks.events = [event];
    mocks.plannerData = makePlannerData([event]);
    mocks.generatedSlots = [scheduleSlot(event)];
    mocks.focus = EndedFocus("unchanged-session");
    render(createElement(PromptHarness));
    act(() => emitDeviationPromptSignal(signal({ id: "unchanged-session" })));

    fireEvent.click(screen.getByRole("button", { name: "Vediamo" }));
    expect(screen.getByRole("status")).toHaveTextContent("Il piano regge così: non serve cambiare niente.");
    expect(mocks.onPreview).not.toHaveBeenCalled();
    expect(mocks.applyChanges).not.toHaveBeenCalled();
  });

  it("does not show a banner when a slot ends without the explicit done declaration", async () => {
    const event = studyEvent();
    mocks.events = [event];
    mocks.plannerData = makePlannerData([event]);
    const active = ActiveFocus("simple-finish-session");
    mocks.focus = active;

    function SimpleEndHarness({ onEnd }: { onEnd: () => void }) {
      useSlotOverrun();
      const flow = useDeviationPrompt({
        plannerData: mocks.plannerData as PlannerData,
        events: mocks.events as StudyEvent[],
        onPreview: mocks.onPreview,
      });
      return createElement(
        "div",
        null,
        createElement("button", { type: "button", onClick: onEnd }, "Concludi sessione"),
        createElement(ReplanBanner, {
          prompt: flow.prompt,
          notice: flow.notice,
          isBuilding: flow.isBuilding,
          onShown: flow.onShown,
          onReorganize: flow.reorganize,
          onLater: flow.dismissLater,
        }),
      );
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      createElement(QueryClientProvider, { client },
        createElement(SimpleEndHarness, {
          onEnd: () => {
            active.endWithReason?.("finished");
            mocks.focus = EndedFocus("simple-finish-session");
            view.rerender(
              createElement(QueryClientProvider, { client },
                createElement(SimpleEndHarness, { onEnd: vi.fn() }),
              ),
            );
          },
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Concludi sessione" }));
    await act(async () => {
      for (let index = 0; index < 5; index += 1) await Promise.resolve();
    });
    expect(active.endWithReason).toHaveBeenCalledWith("finished");
    expect(mocks.toggleCompleted).not.toHaveBeenCalled();
    expect(getPendingDeviationSignals()).toHaveLength(0);
    expect(screen.queryByTestId("replan-banner")).not.toBeInTheDocument();
  });

  it("does not retry a 409, rereads planner data, and reports that the plan changed", async () => {
    const event = studyEvent();
    mocks.events = [event];
    mocks.plannerData = makePlannerData([event]);
    mocks.focus = EndedFocus("conflict-session");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.applyChanges.mockRejectedValueOnce(new Error("409"));
    renderPiano();
    act(() => emitDeviationPromptSignal(signal({ id: "conflict-session" })));

    fireEvent.click(screen.getByRole("button", { name: "Vediamo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Conferma proposta" }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Il piano è cambiato nel frattempo" }));
    });
    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);
    expect(mocks.refetchEvents).toHaveBeenCalledTimes(1);
    expect(mocks.refetchPlannerData).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
