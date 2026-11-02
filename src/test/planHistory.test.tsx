import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanHistory } from "@/components/piano/PlanHistory";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { PlanChange, PlanChangeRow, PlannerJson } from "@/lib/planner/types";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown,
  events: [] as unknown,
  applyChanges: vi.fn(),
}));

vi.mock("@/hooks/usePlanChanges", () => ({
  planChangesKeys: { all: (userId: string | null) => ["plan-changes", userId] },
  usePlanChanges: () => ({ data: mocks.rows, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useStudyEvents", () => ({
  studyEventsKeys: { all: (userId: string | null) => ["study-events", userId] },
  PlanConflictError: class PlanConflictError extends Error {},
  useStudyEventsQuery: () => ({ data: mocks.events, isLoading: false, isError: false, refetch: vi.fn() }),
  useApplyPlanChanges: () => ({ mutateAsync: mocks.applyChanges, isPending: false }),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "user-1" }) }));

const change: PlanChange = {
  op: "insert",
  after: {
    event_date: "2026-11-05",
    event_time: "15:00",
    end_time: "15:45",
    context_id: null,
    lesson_from: null,
    lesson_to: null,
    evaluation_id: "evaluation-1",
    source: "auto",
    subject: "Fisica",
    title: "Ripasso di Fisica",
  },
};

function historyRecord(overrides: Partial<PlanChangeRow> = {}): PlanChangeRow {
  const now = new Date().toISOString();
  return {
    id: "package-1",
    user_id: "user-1",
    changes: [change] as unknown as PlannerJson,
    created_at: now,
    applied_at: now,
    reason: "generate",
    status: "applied",
    undone_at: null,
    ...overrides,
  };
}

function appliedEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "new-study-slot",
    event_type: "study",
    event_date: "2026-11-05",
    event_time: "15:00",
    end_time: "15:45",
    context_id: null,
    lesson_from: null,
    lesson_to: null,
    evaluation_id: "evaluation-1",
    source: "auto",
    subject: "Fisica",
    title: "Ripasso di Fisica",
    status: "planned",
    is_completed: false,
    version: 0,
    ...overrides,
  };
}

function renderHistory() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlanHistory open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.rows = [historyRecord()];
  mocks.events = [appliedEvent()];
  mocks.applyChanges.mockReset();
  mocks.applyChanges.mockResolvedValue({ packageId: "inverse-package" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PlanHistory", () => {
  it("sends the inverse package when a recent change is undone", async () => {
    renderHistory();

    expect(await screen.findByRole("heading", { name: "Cronologia modifiche" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Annulla" }));

    await waitFor(() => expect(mocks.applyChanges).toHaveBeenCalledTimes(1));
    expect(mocks.applyChanges).toHaveBeenCalledWith({
      reason: "manual",
      changes: [expect.objectContaining({
        op: "delete",
        event_id: "new-study-slot",
        version: 0,
      })],
    });
    expect(await screen.findByText("Annullato")).toBeVisible();
  });

  it("shows the concurrent-change message when the inverse receives a 409", async () => {
    mocks.applyChanges.mockRejectedValue(new Error("version_conflict"));
    renderHistory();

    fireEvent.click(await screen.findByRole("button", { name: "Annulla" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Il piano è cambiato nel frattempo");
    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);
  });

  it("refuses to undo a slot that has already been completed", async () => {
    mocks.events = [appliedEvent({ status: "done", is_completed: true })];
    renderHistory();

    fireEvent.click(await screen.findByRole("button", { name: "Annulla" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Non annullabile: Ripasso di Fisica è già fatta");
    expect(mocks.applyChanges).not.toHaveBeenCalled();
  });
});
