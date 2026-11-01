import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";
import { edgeFetch } from "@/lib/edgeFetch";
import {
  PlanConflictError,
  studyEventsKeys,
  useAddStudyEvents,
  useApplyPlanChanges,
  useToggleStudyEventCompleted,
  useUpdateStudyEvent,
  type StudyEvent,
} from "@/hooks/useStudyEvents";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: "user-1", isAuthenticated: true }),
}));
vi.mock("@/lib/edgeFetch", () => ({ edgeFetch: vi.fn() }));

const mockedEdgeFetch = vi.mocked(edgeFetch);

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client },
      createElement(SaveStatusProvider, null, children),
    );
  };
}

function cachedEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "event-1",
    subject: "Fisica",
    title: "Ripasso",
    event_date: "2026-11-05",
    event_time: "15:00",
    event_type: "study",
    is_completed: false,
    status: "planned",
    version: 0,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("study event mutation payloads", () => {
  it("sends the optional add fields through to save-event", async () => {
    mockedEdgeFetch.mockResolvedValue({ success: true } as never);
    const client = makeClient();
    const { result } = renderHook(() => useAddStudyEvents(), { wrapper: makeWrapper(client) });
    const events = [{
      subject: "Fisica",
      title: "Ripasso",
      date: "2026-11-05",
      time: "15:00",
      type: "study" as const,
      notes: "Capitolo 2",
      endTime: "16:00",
      contextId: "9f6a1a2b-3c4d-5e6f-8a9b-0c1d2e3f4a5b",
      evaluationId: "a6b2c1d0-4e5f-6789-abcd-0123456789ab",
      source: "ai" as const,
      status: "planned" as const,
      lessonFrom: 1,
      lessonTo: 2,
    }];

    await act(async () => {
      await result.current.mutateAsync(events);
    });

    expect(mockedEdgeFetch).toHaveBeenCalledWith("save-event", {
      userId: "user-1",
      action: "add",
      events,
    });
  });

  it("adds the cached version to update payloads for existing callers", async () => {
    mockedEdgeFetch.mockResolvedValue({ success: true } as never);
    const client = makeClient();
    client.setQueryData(studyEventsKeys.all("user-1"), [cachedEvent({ version: 0 })]);
    const { result } = renderHook(() => useUpdateStudyEvent(), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ id: "event-1", completed: true });
    });

    expect(mockedEdgeFetch).toHaveBeenCalledWith("save-event", {
      userId: "user-1",
      action: "update",
      event: { id: "event-1", completed: true, version: 0 },
    });
  });

  it("keeps optimistic status and completion fields coherent", async () => {
    mockedEdgeFetch.mockResolvedValue({ success: true } as never);
    const client = makeClient();
    const queryKey = studyEventsKeys.all("user-1");
    client.setQueryData(queryKey, [cachedEvent({
      status: "done",
      is_completed: true,
      completed_at: "2026-10-31T10:00:00.000Z",
    })]);
    const { result } = renderHook(() => useUpdateStudyEvent(), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ id: "event-1", version: 0, status: "planned" });
    });
    expect(client.getQueryData<StudyEvent[]>(queryKey)?.[0]).toMatchObject({
      status: "planned",
      is_completed: false,
      completed_at: null,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "event-1", version: 0, status: "done" });
    });
    const completed = client.getQueryData<StudyEvent[]>(queryKey)?.[0];
    expect(completed).toMatchObject({ status: "done", is_completed: true });
    expect(completed?.completed_at).toEqual(expect.any(String));
  });

  it("sends an atomic plan-change package with its reason", async () => {
    mockedEdgeFetch.mockResolvedValue({ packageId: "package-1" } as never);
    const client = makeClient();
    const { result } = renderHook(() => useApplyPlanChanges(), { wrapper: makeWrapper(client) });
    const changes = [{
      op: "update" as const,
      event_id: "9f6a1a2b-3c4d-5e6f-8a9b-0c1d2e3f4a5b",
      version: 0,
      after: { event_date: "2026-11-06" },
    }];

    await act(async () => {
      await expect(result.current.mutateAsync({ reason: "skip", changes })).resolves.toEqual({ packageId: "package-1" });
    });

    expect(mockedEdgeFetch).toHaveBeenCalledWith("save-event", {
      userId: "user-1",
      action: "applyChanges",
      reason: "skip",
      changes,
    });
  });

  it("optimistically toggles completion, rolls back conflicts, and invalidates the query", async () => {
    let rejectRequest!: (error: Error) => void;
    mockedEdgeFetch.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }) as never);
    const client = makeClient();
    const queryKey = studyEventsKeys.all("user-1");
    const original = cachedEvent({ version: 4 });
    client.setQueryData(queryKey, [original]);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useToggleStudyEventCompleted(), { wrapper: makeWrapper(client) });
    let mutation!: Promise<unknown>;

    await act(async () => {
      mutation = result.current.mutateAsync({ id: original.id, next: true });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(client.getQueryData<StudyEvent[]>(queryKey)?.[0]).toMatchObject({
        status: "done",
        is_completed: true,
      });
    });

    await act(async () => {
      rejectRequest(new Error("version_conflict"));
      await expect(mutation).rejects.toBeInstanceOf(PlanConflictError);
    });
    await waitFor(() => expect(client.getQueryData(queryKey)).toEqual([original]));

    expect(mockedEdgeFetch).toHaveBeenCalledWith("save-event", {
      userId: "user-1",
      action: "update",
      event: { id: original.id, version: 4, completed: true },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });
});
