import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanSlot, type PlanSlotData } from "@/components/piano/PlanSlot";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import { PlanConflictError, studyEventsKeys } from "@/hooks/useStudyEvents";
import type { PlannerEntry } from "@/lib/plannerEntries";
import type { PlanChange } from "@/lib/planner/types";

const mocks = vi.hoisted(() => ({
  applyPlanChanges: vi.fn(),
  toggleStudyEventCompleted: vi.fn(),
  toggleEvaluationCompleted: vi.fn(),
  toast: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "student-1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast, dismiss: mocks.dismiss }) }));
vi.mock("@/hooks/useStudyEvents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useStudyEvents")>();
  return {
    ...actual,
    useApplyPlanChanges: () => ({ mutateAsync: mocks.applyPlanChanges, isPending: false }),
    useToggleStudyEventCompleted: () => ({ mutateAsync: mocks.toggleStudyEventCompleted, isPending: false }),
  };
});
vi.mock("@/hooks/useEvaluations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useEvaluations")>();
  return {
    ...actual,
    useToggleEvaluationCompleted: () => ({ mutateAsync: mocks.toggleEvaluationCompleted, isPending: false }),
  };
});

const today = "2026-11-02";

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "study-slot-1",
    subject: "Biologia",
    title: "Da Minilezione 1 a 7",
    event_date: today,
    event_time: "15:00",
    end_time: "16:20",
    event_type: "study",
    context_id: "biology-context",
    lesson_from: 0,
    lesson_to: 6,
    source: "auto",
    status: "planned",
    is_completed: false,
    move_count: 0,
    version: 4,
    ...overrides,
  };
}

function plannerEntry(event: StudyEvent): PlannerEntry {
  return {
    id: event.id,
    kind: event.event_type === "study" ? "study" : event.event_type === "test" ? "evaluation" : "assignment",
    date: new Date(2026, 10, 2),
    time: event.event_time ?? undefined,
    title: event.title,
    subject: event.subject,
    coverName: event.subject,
    important: false,
    completed: event.status === "done" || event.is_completed === true,
    endTime: event.end_time,
    status: event.status,
    contextId: event.context_id,
    lessonFrom: event.lesson_from,
    lessonTo: event.lesson_to,
    source: event.source,
    moveCount: event.move_count,
    version: event.version,
    original: { kind: "studyEvent", data: event },
  };
}

function planSlot(event: StudyEvent, overrides: Partial<PlanSlotData> = {}): PlanSlotData {
  return {
    id: event.id,
    kind: event.event_type === "study" ? "study" : event.event_type === "test" ? "evaluation" : "assignment",
    title: event.title,
    subject: event.subject,
    startTime: event.event_time,
    endTime: event.end_time,
    durationMinutes: 80,
    lessonFrom: event.lesson_from,
    lessonTo: event.lesson_to,
    status: event.status,
    completed: event.status === "done" || event.is_completed === true,
    ...overrides,
  };
}

function applyPlanPackageToCache(client: QueryClient, changes: PlanChange[]) {
  const key = studyEventsKeys.all("student-1");
  const events = [...(client.getQueryData<StudyEvent[]>(key) ?? [])];
  for (const change of changes) {
    if (change.op === "update") {
      const index = events.findIndex((event) => event.id === change.event_id);
      if (index >= 0) {
        const current = events[index];
        events[index] = {
          ...current,
          ...change.after,
          version: (current.version ?? 0) + 1,
          is_completed: change.after.status === "done",
          completed_at: change.after.status === "done" ? "2026-11-02T15:00:00.000Z" : null,
        };
      }
    } else if (change.op === "insert") {
      events.push({
        ...change.after,
        id: "continuation-1",
        event_type: "study",
        status: "planned",
        is_completed: false,
        version: 0,
      });
    } else {
      const index = events.findIndex((event) => event.id === change.event_id);
      if (index >= 0) events.splice(index, 1);
    }
  }
  client.setQueryData(key, events);
}

function mountSlot(event = studyEvent(), slot = planSlot(event)) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(studyEventsKeys.all("student-1"), [event]);
  const view = render(
    <QueryClientProvider client={client}>
      <ol role="list"><PlanSlot slot={slot} entry={plannerEntry(event)} /></ol>
    </QueryClientProvider>,
  );
  return { client, ...view };
}

function toastActionOptions() {
  return mocks.toast.mock.calls[0][0] as {
    title: string;
    duration: number;
    "aria-live": string;
    action: ReactElement<{ onClick: (event: { preventDefault: () => void }) => void; children?: unknown }>;
  };
}

beforeEach(() => {
  mocks.applyPlanChanges.mockReset().mockResolvedValue({ packageId: "package-1" });
  mocks.toggleStudyEventCompleted.mockReset().mockResolvedValue({});
  mocks.toggleEvaluationCompleted.mockReset().mockResolvedValue({});
  mocks.toast.mockReset().mockReturnValue({ id: "toast-1" });
  mocks.dismiss.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("slot completion actions", () => {
  it("splits a 1–7 study slot at mini-lesson 3 and can undo the package", async () => {
    const event = studyEvent();
    const { client } = mountSlot(event);
    let firstPackage = true;
    mocks.applyPlanChanges.mockImplementation(async ({ changes }: { changes: PlanChange[] }) => {
      if (firstPackage) {
        firstPackage = false;
        applyPlanPackageToCache(client, changes);
      }
      return { packageId: "package-1" };
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Azioni per Da Minilezione 1 a 7" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    expect(screen.getByRole("menuitem", { name: "Tutte le 7 minilezioni" })).toBeVisible();
    fireEvent.click(screen.getByRole("menuitem", { name: "Solo alcune: fino a Minilezione 3" }));

    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledTimes(1));
    const firstCall = mocks.applyPlanChanges.mock.calls[0][0] as { reason: string; changes: PlanChange[] };
    expect(firstCall.reason).toBe("manual");
    expect(firstCall.changes[0]).toMatchObject({
      op: "update",
      event_id: "study-slot-1",
      version: 4,
      before: { lesson_from: 0, lesson_to: 6, status: "planned" },
      after: { lesson_to: 2, status: "done", source: "replan" },
    });
    expect(firstCall.changes[1]).toMatchObject({
      op: "insert",
      after: {
        event_date: today,
        event_time: null,
        end_time: null,
        context_id: "biology-context",
        lesson_from: 3,
        lesson_to: 6,
        source: "replan",
        subject: "Biologia",
        title: "Da Minilezione 4 a 7",
      },
    });
    expect(toastActionOptions()).toMatchObject({
      title: "Fatte 3 di 7 minilezioni.",
      duration: 10_000,
      "aria-live": "polite",
    });

    const undoButton = toastActionOptions().action;
    await act(async () => {
      undoButton.props.onClick({ preventDefault: vi.fn() });
    });
    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledTimes(2));

    const inverse = mocks.applyPlanChanges.mock.calls[1][0] as { reason: string; changes: PlanChange[] };
    expect(inverse.reason).toBe("manual");
    expect(inverse.changes[0]).toMatchObject({
      op: "delete",
      event_id: "continuation-1",
      version: 0,
    });
    expect(inverse.changes[1]).toMatchObject({
      op: "update",
      event_id: "study-slot-1",
      version: 5,
      after: { lesson_from: 0, lesson_to: 6, status: "planned", source: "auto" },
    });
    expect(mocks.dismiss).toHaveBeenCalledWith("toast-1");
  });

  it("announces a completed study duration and offers a ten-second undo", async () => {
    const event = studyEvent({ lesson_from: null, lesson_to: null });
    const slot = planSlot(event, { lessonFrom: null, lessonTo: null, durationMinutes: 80 });
    mountSlot(event, slot);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Azioni per Da Minilezione 1 a 7" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Segna fatto" }));

    await waitFor(() => expect(mocks.toggleStudyEventCompleted).toHaveBeenCalledWith({
      id: "study-slot-1",
      next: true,
      version: 4,
    }));
    expect(toastActionOptions()).toMatchObject({
      title: "Fatto. 1 h 20 di studio oggi.",
      duration: 10_000,
      "aria-live": "polite",
    });
    expect(toastActionOptions().action.props.children).toBe("Annulla");
  });

  it("reports a conflict if the plan changes before undo is applied", async () => {
    const event = studyEvent();
    const { client } = mountSlot(event);
    let initialApply = true;
    mocks.applyPlanChanges.mockImplementation(async ({ changes }: { changes: PlanChange[] }) => {
      if (initialApply) {
        initialApply = false;
        applyPlanPackageToCache(client, changes);
        return { packageId: "package-1" };
      }
      throw new PlanConflictError();
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Azioni per Da Minilezione 1 a 7" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Tutte le 7 minilezioni" }));
    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledTimes(1));

    const undoButton = toastActionOptions().action;
    await act(async () => {
      undoButton.props.onClick({ preventDefault: vi.fn() });
    });
    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.toast).toHaveBeenLastCalledWith(expect.objectContaining({
      title: "Il piano è cambiato nel frattempo",
      "aria-live": "polite",
    })));
  });

  it("announces a skipped slot politely and makes it undoable", async () => {
    const event = studyEvent({ lesson_from: null, lesson_to: null });
    const slot = planSlot(event, { lessonFrom: null, lessonTo: null });
    mountSlot(event, slot);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Azioni per Da Minilezione 1 a 7" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Salta" }));

    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledWith({
      reason: "skip",
      changes: [expect.objectContaining({ op: "update", event_id: "study-slot-1", after: { status: "skipped" } })],
    }));
    expect(toastActionOptions()).toMatchObject({
      title: "Saltata.",
      duration: 10_000,
      "aria-live": "polite",
    });
  });

  it("reports a 409 and refreshes the plan", async () => {
    const event = studyEvent({ lesson_from: null, lesson_to: null });
    const slot = planSlot(event, { lessonFrom: null, lessonTo: null });
    const { client } = mountSlot(event, slot);
    const invalidateQueries = vi.spyOn(client, "invalidateQueries");
    mocks.applyPlanChanges.mockRejectedValue(new PlanConflictError());

    fireEvent.pointerDown(screen.getByRole("button", { name: "Azioni per Da Minilezione 1 a 7" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Salta" }));

    await waitFor(() => expect(mocks.applyPlanChanges).toHaveBeenCalledWith({
      reason: "skip",
      changes: [expect.objectContaining({ op: "update", event_id: "study-slot-1", after: { status: "skipped" } })],
    }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Il piano è cambiato nel frattempo",
      "aria-live": "polite",
    })));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: studyEventsKeys.all("student-1") });
  });
});
