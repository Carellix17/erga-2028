import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlotProgress } from "@/hooks/useSlotProgress";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import { studyEventsKeys } from "@/hooks/useStudyEvents";
import { lessonsKeys, type LessonsListData } from "@/hooks/useLessons";

const mocks = vi.hoisted(() => ({
  events: null as unknown,
  applyPlanChanges: vi.fn(),
  refetchEvents: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "student-1" }) }));
vi.mock("@/hooks/useStudyEvents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useStudyEvents")>();
  return {
    ...actual,
    useStudyEventsQuery: () => ({ data: mocks.events as StudyEvent[] | undefined, refetch: mocks.refetchEvents }),
    useApplyPlanChanges: () => ({ mutateAsync: mocks.applyPlanChanges }),
  };
});

const today = "2026-11-02";
const contextId = "biology-context";

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "slot-1",
    subject: "Biologia",
    title: "Da Minilezione 1 a 7",
    event_date: today,
    event_time: "09:00",
    end_time: "10:00",
    event_type: "study",
    context_id: contextId,
    lesson_from: 0,
    lesson_to: 6,
    source: "auto",
    status: "planned",
    is_completed: false,
    move_count: 0,
    version: 5,
    ...overrides,
  };
}

function makeClient(completed: number[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const list: LessonsListData = { lessons: [], currentIndex: 0, completed, finalTest: null };
  client.setQueryData(lessonsKeys.list("student-1", contextId), list);
  return client;
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  mocks.events = [];
  mocks.applyPlanChanges.mockReset().mockResolvedValue({ packageId: "package-1" });
  mocks.refetchEvents.mockReset().mockResolvedValue({ data: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useSlotProgress", () => {
  it("matches context and range, preferring the slot currently in progress", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T00:30:00+01:00"));
    mocks.events = [
      studyEvent({ id: "other-context", context_id: "chemistry-context", event_date: today }),
      studyEvent({ id: "outside-range", lesson_from: 4, lesson_to: 8, event_date: today }),
      studyEvent({ id: "tomorrow", event_date: "2026-11-03" }),
      studyEvent({ id: "later-today", event_time: "07:00", end_time: "08:00", event_date: today, version: 6 }),
      studyEvent({ id: "overnight-current", event_date: "2026-11-01", event_time: "23:30", end_time: "01:00", version: 9 }),
    ];
    const client = makeClient([0, 1]);
    const { result } = renderHook(() => useSlotProgress(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ contextId, order: 2 });
    });

    expect(mocks.applyPlanChanges).toHaveBeenCalledWith({
      reason: "manual",
      changes: [expect.objectContaining({
        op: "update",
        event_id: "overnight-current",
        version: 9,
        before: expect.objectContaining({ status: "planned", lesson_from: 0, lesson_to: 6 }),
        after: { status: "partial" },
      })],
    });
  });

  it("marks the slot done only after every zero-based lesson order in its range is complete", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T10:00:00+01:00"));
    mocks.events = [studyEvent({ id: "three-lessons", event_time: "10:00", end_time: "11:00", lesson_to: 2 })];
    const client = makeClient([0, 1]);
    const { result } = renderHook(() => useSlotProgress(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ contextId, order: 2 });
    });

    expect(mocks.applyPlanChanges).toHaveBeenCalledWith({
      reason: "manual",
      changes: [expect.objectContaining({
        op: "update",
        event_id: "three-lessons",
        after: { status: "done" },
      })],
    });
  });

  it("silently does nothing when no matching slot exists", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T10:00:00+01:00"));
    mocks.events = [studyEvent({ event_date: "2026-11-05" })];
    const client = makeClient([]);
    const { result } = renderHook(() => useSlotProgress(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ contextId, order: 2 });
    });

    expect(mocks.applyPlanChanges).not.toHaveBeenCalled();
  });

  it("refetches events once when the query cache and query data are empty", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T10:00:00+01:00"));
    const event = studyEvent({ id: "loaded-after-refetch", lesson_to: 2, event_time: "10:00", end_time: "11:00" });
    mocks.events = null;
    mocks.refetchEvents.mockResolvedValue({ data: [event] });
    const client = makeClient([0, 1]);
    const { result } = renderHook(() => useSlotProgress(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ contextId, order: 2 });
    });

    expect(mocks.refetchEvents).toHaveBeenCalledTimes(1);
    expect(mocks.applyPlanChanges).toHaveBeenCalledWith({
      reason: "manual",
      changes: [expect.objectContaining({ event_id: "loaded-after-refetch", after: { status: "done" } })],
    });
    expect(client.getQueryData(studyEventsKeys.all("student-1"))).toBeUndefined();
  });
});
