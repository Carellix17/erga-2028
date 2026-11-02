import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoReplan, type ReplanPrompt } from "@/hooks/useAutoReplan";
import { NoSpaceDialog } from "@/components/piano/NoSpaceDialog";
import i18n from "@/i18n";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { PlannerData } from "@/hooks/usePlannerData";
import type { StudyEventRow } from "@/lib/planner/types";

const mocks = vi.hoisted(() => ({ focus: null as unknown }));

vi.mock("@/contexts/FocusContext", () => ({
  useOptionalFocus: () => mocks.focus,
}));

const slot: StudyEventRow = {
  completed_at: null,
  context_id: "context-1",
  created_at: "2026-11-01T12:00:00.000Z",
  end_time: "16:00",
  event_date: "2026-11-02",
  event_time: "15:00",
  event_type: "study",
  evaluation_id: "evaluation-1",
  id: "slot-1",
  is_completed: false,
  lesson_from: 0,
  lesson_to: 5,
  locked: false,
  move_count: 0,
  notes: null,
  original_date: null,
  original_time: null,
  source: "auto",
  status: "planned",
  subject: "Storia",
  title: "Ripasso di storia",
  updated_at: "2026-11-01T12:00:00.000Z",
  user_id: "user-1",
  version: 2,
};

const routines = [
  { kind: "other", start_time: "06:30", end_time: "15:00", days_of_week: [1, 2, 3, 4, 5, 6, 7] },
  { kind: "sleep", start_time: "20:30", end_time: "06:30", days_of_week: [1, 2, 3, 4, 5, 6, 7] },
];

function plannerData(
  askBeforeMove = false,
  overrides: Partial<PlannerData> = {},
): PlannerData {
  return {
    askBeforeMove,
    routines,
    events: [slot],
    evaluations: [{
      id: "evaluation-1",
      date: "2026-11-05",
      is_completed: false,
      topic_type: "linked",
      topic_id: "context-1",
      subject_id: "subject-1",
      title: "Verifica di storia",
      subject: "Storia",
    }],
    lessonsByContext: {},
    completedByContext: {},
    readingLogs: [],
    settings: {},
    subjectOverrides: {},
    contextMetadata: {},
    buildPlanInput: () => ({}) as never,
    ...overrides,
  };
}

function mount(
  askBeforeMove = false,
  onApply = vi.fn(async () => "applied" as const),
  onPreview = vi.fn(),
  dataOverrides: Partial<PlannerData> = {},
  queryEvents?: readonly StudyEvent[],
) {
  const onPromptChange = vi.fn();
  const hook = renderHook(() => useAutoReplan({
    plannerData: plannerData(askBeforeMove, dataOverrides),
    events: queryEvents,
    enabled: true,
    blocked: false,
    prompt: null,
    onPromptChange,
    onPreview,
    onApply,
  }));
  return { ...hook, onApply, onPreview, onPromptChange };
}

beforeEach(async () => {
  await i18n.changeLanguage("it");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T15:14:00.000Z"));
  mocks.focus = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAutoReplan", () => {
  it("waits through 16:14 and moves a 15:00–16:00 slot at 16:16", async () => {
    const onApply = vi.fn(async () => "applied" as const);
    const { onPromptChange, onPreview } = mount(false, onApply);

    expect(onApply).not.toHaveBeenCalled();
    expect(onPreview).not.toHaveBeenCalled();
    expect(onPromptChange).not.toHaveBeenCalled();

    await act(async () => {
      vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      reason: "skip",
      kind: "moved",
      changes: [expect.objectContaining({
        op: "update",
        event_id: "slot-1",
        version: 2,
        after: expect.objectContaining({
          event_date: "2026-11-02",
          event_time: "16:16",
          end_time: "17:16",
          move_count: 1,
        }),
      })],
    }));
  });

  it("uses the fresh study-events query so a stale planned row cannot move a completed slot", () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);
    const freshCompletedEvent: StudyEvent = {
      id: slot.id,
      subject: slot.subject,
      title: slot.title,
      event_date: slot.event_date,
      event_time: slot.event_time,
      event_type: "study",
      is_completed: true,
      status: "done",
      source: "auto",
      version: slot.version + 1,
    };

    mount(false, onApply, vi.fn(), {}, [freshCompletedEvent]);

    expect(onApply).not.toHaveBeenCalled();
  });

  it("runs the initial check after an opening dialog stops blocking the planner", () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);
    const onPromptChange = vi.fn();
    const onPreview = vi.fn();
    const { rerender } = renderHook(({ blocked }: { blocked: boolean }) => useAutoReplan({
      plannerData: plannerData(),
      enabled: true,
      blocked,
      prompt: null,
      onPromptChange,
      onPreview,
      onApply,
    }), { initialProps: { blocked: true } });

    expect(onApply).not.toHaveBeenCalled();
    rerender({ blocked: false });
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("opens the preview instead of applying when ask_before_move is enabled", async () => {
    const onApply = vi.fn(async () => "applied" as const);
    const onPreview = vi.fn();
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));

    mount(true, onApply, onPreview);

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({
      reason: "skip",
      changes: [expect.objectContaining({ op: "update", event_id: "slot-1" })],
    }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("serializes close renders and visibility checks to one applyChanges package", async () => {
    const onApply = vi.fn(async () => "applied" as const);
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const { rerender } = mount(false, onApply);

    await act(async () => {
      rerender();
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("does not automatically retry a conflicted slot after refreshed versions arrive", async () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "conflict" as const);
    const onPromptChange = vi.fn();
    const onPreview = vi.fn();
    const { rerender } = renderHook(({ row }: { row: StudyEventRow }) => useAutoReplan({
      plannerData: plannerData(false, { events: [row] }),
      enabled: true,
      blocked: false,
      prompt: null,
      onPromptChange,
      onPreview,
      onApply,
    }), { initialProps: { row: slot } });

    expect(onApply).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    rerender({ row: { ...slot, version: slot.version + 1 } });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("shows the no-space choice dialog when no free time exists before the verification", () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);
    const evaluation = plannerData().evaluations[0];
    const { onPromptChange } = mount(false, onApply, vi.fn(), {
      evaluations: [{ ...evaluation, date: "2026-11-02" }],
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(onPromptChange).toHaveBeenCalledWith(expect.objectContaining({
      kind: "no_space",
      slot: expect.objectContaining({ id: "slot-1" }),
      deadline: "2026-11-02",
    }));
  });

  it("offers the third move for confirmation and applies the chosen day with reason skip", async () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);
    const movedTwice = { ...slot, move_count: 2 };
    const { result, onPromptChange } = mount(false, onApply, vi.fn(), { events: [movedTwice] });
    const prompt = onPromptChange.mock.calls[0]?.[0] as ReplanPrompt;

    expect(prompt).toMatchObject({
      kind: "move_limit",
      suggestedDate: "2026-11-02",
      suggestedTime: "16:16",
    });
    await act(async () => result.current.handleKeep(prompt));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      reason: "skip",
      kind: "kept",
      changes: [expect.objectContaining({
        op: "update",
        event_id: "slot-1",
        after: expect.objectContaining({ move_count: 3, event_time: "16:16" }),
      })],
    }));
  });

  it("splits a move-limit session into two shorter lesson ranges", async () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);
    const movedTwice = { ...slot, move_count: 2 };
    const { result, onPromptChange } = mount(false, onApply, vi.fn(), { events: [movedTwice] });
    const prompt = onPromptChange.mock.calls[0]?.[0] as ReplanPrompt;

    await act(async () => result.current.handleSplit(prompt));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      reason: "skip",
      kind: "split",
      changes: [
        expect.objectContaining({
          op: "update",
          after: expect.objectContaining({ lesson_from: 0, lesson_to: 2, move_count: 3, end_time: "16:46" }),
        }),
        expect.objectContaining({
          op: "insert",
          after: expect.objectContaining({ lesson_from: 3, lesson_to: 5, event_time: "16:46", end_time: "17:16" }),
        }),
      ],
    }));
  });

  it("repackages a partial slot only after its end and preserves the completed lesson prefix", () => {
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const partial = { ...slot, status: "partial" as const };
    const onApply = vi.fn(async () => "applied" as const);

    mount(false, onApply, vi.fn(), {
      events: [partial],
      completedByContext: { "context-1": [0, 1] },
    });

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      reason: "skip",
      kind: "partial",
      changes: [
        expect.objectContaining({ op: "update", after: expect.objectContaining({ lesson_to: 1, status: "done" }) }),
        expect.objectContaining({ op: "insert", after: expect.objectContaining({ lesson_from: 2, lesson_to: 5 }) }),
      ],
    }));
  });

  it("does not move the slot currently used by the focus timer", () => {
    mocks.focus = { isActive: true, task: { eventId: "slot-1" } };
    vi.setSystemTime(new Date("2026-11-02T15:16:00.000Z"));
    const onApply = vi.fn(async () => "applied" as const);

    mount(false, onApply);

    expect(onApply).not.toHaveBeenCalled();
  });
});

describe("NoSpaceDialog", () => {
  it("announces the deadline and offers accessible manual choices", () => {
    const onChooseTime = vi.fn();
    const onShortenSessions = vi.fn();
    render(
      <NoSpaceDialog
        prompt={{ kind: "no_space", slot, deadline: "2026-11-09" }}
        onDismiss={vi.fn()}
        onKeep={vi.fn()}
        onSplit={vi.fn()}
        onChooseTime={onChooseTime}
        onShortenSessions={onShortenSessions}
      />,
    );

    expect(screen.getByRole("heading", { name: "Non trovo spazio prima della verifica di lunedì." })).toBeVisible();
    expect(screen.getByText("Puoi scegliere un orario o riorganizzare la settimana.")).toBeVisible();
    const chooseTime = screen.getByRole("button", { name: "Scegli tu un orario" });
    const shorten = screen.getByRole("button", { name: "Accorcia altre sessioni" });
    expect(chooseTime).toHaveClass("min-h-11");
    expect(shorten).toHaveClass("min-h-11");
    fireEvent.click(chooseTime);
    fireEvent.click(shorten);
    expect(onChooseTime).toHaveBeenCalledTimes(1);
    expect(onShortenSessions).toHaveBeenCalledTimes(1);
  });
});
