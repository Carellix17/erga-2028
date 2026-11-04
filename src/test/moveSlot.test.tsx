import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DayTimeline } from "@/components/piano/DayTimeline";
import { MoveSlotSheet } from "@/components/piano/MoveSlotSheet";
import { PianoView } from "@/components/piano/PianoView";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { PlannerEntry } from "@/lib/plannerEntries";

const mocks = vi.hoisted(() => ({
  events: [] as unknown[],
  applyChanges: vi.fn<(request: Record<string, unknown>) => Promise<void>>(),
  toast: vi.fn<(options: Record<string, unknown>) => { id: string }>(() => ({ id: "move-toast" })),
  dismiss: vi.fn(),
}));

vi.mock("@/hooks/useLessons", () => ({
  useLessonsQuery: () => ({ data: { lessons: [], completed: [] } }),
}));
vi.mock("@/hooks/useStudyEvents", () => ({
  studyEventsKeys: { all: (userId: string | null) => ["study-events", userId] },
  PlanConflictError: class PlanConflictError extends Error {},
  useStudyEventsQuery: () => ({ data: mocks.events, isLoading: false, isError: false, refetch: vi.fn() }),
  useAddStudyEvents: () => ({ mutateAsync: vi.fn() }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
  useApplyPlanChanges: () => ({ mutateAsync: mocks.applyChanges, isPending: false }),
  useToggleStudyEventCompleted: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluation: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleEvaluationCompleted: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useUserRoutines", () => ({ useUserRoutines: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/usePlannerData", () => ({
  usePlannerData: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
  plannerDataKeys: { all: (userId: string | null) => ["planner-data", userId] },
}));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "student" }) }));
vi.mock("@/hooks/useAutoReplan", () => ({
  useAutoReplan: () => ({ handleKeep: vi.fn(), handleSplit: vi.fn() }),
}));
vi.mock("@/hooks/usePlanChanges", () => ({ planChangesKeys: { all: (userId: string | null) => ["plan-changes", userId] } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast, dismiss: mocks.dismiss }) }));
vi.mock("@/hooks/useSlotReminders", () => ({ useSlotReminders: vi.fn() }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/utils/haptics", () => ({ triggerHaptic: vi.fn() }));
vi.mock("@/components/piano/AddEventSheet", () => ({ AddEventSheet: () => null }));
vi.mock("@/components/piano/EditStudyEventSheet", () => ({ EditStudyEventSheet: () => null }));
vi.mock("@/components/piano/ChangePreview", () => ({ ChangePreview: () => null }));
vi.mock("@/components/piano/PlanHistory", () => ({ PlanHistory: () => null }));
vi.mock("@/components/piano/NoSpaceDialog", () => ({ NoSpaceDialog: () => null }));

const dateKey = "2026-11-02";

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "study-1",
    subject: "Biologia",
    title: "Ripasso",
    event_date: dateKey,
    event_time: "15:00",
    end_time: "16:00",
    event_type: "study",
    status: "planned",
    is_completed: false,
    locked: false,
    move_count: 2,
    version: 6,
    ...overrides,
  };
}

function plannerEntry(event: StudyEvent, overrides: Partial<PlannerEntry> = {}): PlannerEntry {
  return {
    id: event.id,
    kind: "study",
    date: new Date(`${event.event_date}T00:00:00`),
    time: event.event_time ?? undefined,
    title: event.title,
    subject: event.subject,
    coverName: event.subject,
    important: false,
    completed: !!event.is_completed,
    endTime: event.end_time,
    status: event.status,
    original: { kind: "studyEvent", data: event },
    ...overrides,
  };
}

const timelineProps = {
  dateKey,
  entries: [] as PlannerEntry[],
  exitingIds: [] as string[],
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  routines: [],
  routinesLoading: false,
};

function renderSheet({
  event = studyEvent(),
  target = { date: dateKey, time: "15:00" },
  entries = [],
  onSave = vi.fn(async () => "applied" as const),
  onOpenChange = vi.fn(),
}: {
  event?: StudyEvent;
  target?: { date: string; time: string };
  entries?: PlannerEntry[];
  onSave?: (event: StudyEvent, target: { date: string; time: string; endTime: string }) => Promise<"applied" | "conflict" | "failed">;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  return {
    onSave,
    onOpenChange,
    ...render(
      <MoveSlotSheet
        request={{ event, target }}
        entries={entries}
        routines={[]}
        routinesLoading={false}
        now={new Date("2026-11-01T12:00:00+01:00")}
        onSave={onSave}
        onOpenChange={onOpenChange}
      />,
    ),
  };
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  mocks.events = [];
  mocks.applyChanges.mockReset().mockResolvedValue(undefined);
  mocks.toast.mockReset().mockReturnValue({ id: "move-toast" });
  mocks.dismiss.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("spostamento manual degli slot", () => {
  it("mostra sette giorni, orario a passi di cinque minuti, anteprima e conferma", async () => {
    const event = studyEvent();
    const onSave = vi.fn(async () => "applied" as const);
    const onOpenChange = vi.fn();
    renderSheet({ event, onSave, onOpenChange });

    expect(screen.getByRole("group", { name: "Giorni della settimana" }).querySelectorAll("button")).toHaveLength(7);
    const timeInput = screen.getByLabelText("Nuovo orario");
    expect(timeInput).toHaveAttribute("type", "time");
    expect(timeInput).toHaveAttribute("step", "300");
    expect(screen.getByText(/Da lun 15:00 a lun 15:00–16:00\. Nessun conflitto\./)).toBeVisible();

    fireEvent.change(timeInput, { target: { value: "15:05" } });
    expect(screen.getByText(/Da lun 15:00 a lun 15:05–16:05\. Nessun conflitto\./)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Sposta" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(event, {
      date: dateKey,
      time: "15:05",
      endTime: "16:05",
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("presenta le tre alternative sul conflitto e non scrive finché non è risolto", async () => {
    const event = studyEvent({ end_time: "16:30" });
    const occupied = studyEvent({
      id: "busy-1",
      title: "Impegno",
      event_type: "assignment",
      event_time: "17:00",
      end_time: "19:00",
    });
    const onSave = vi.fn(async () => "applied" as const);
    renderSheet({
      event,
      target: { date: dateKey, time: "16:30" },
      entries: [plannerEntry(occupied, { kind: "assignment" })],
      onSave,
    });

    expect(screen.getByRole("status")).toHaveTextContent("Questo orario è in conflitto");
    expect(screen.getByRole("button", { name: "Metti dopo, alle 19:00" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Accorcia a 17:00" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lascia così" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sposta" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Metti dopo, alle 19:00" }));
    expect(screen.getByLabelText("Nuovo orario")).toHaveValue("19:00");
    expect(screen.getByRole("button", { name: "Sposta" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Sposta" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(event, {
      date: dateKey,
      time: "19:00",
      endTime: "20:30",
    }));
  });

  it("mostra l'azione solo per gli slot di studio non fatti e non saltati", () => {
    const planned = plannerEntry(studyEvent());
    const done = plannerEntry(studyEvent({ id: "done", status: "done", is_completed: true }), { completed: true });
    const skipped = plannerEntry(studyEvent({ id: "skipped", status: "skipped" }));
    const occupiedEvent = studyEvent({ id: "busy", event_type: "assignment", title: "Occupato" });
    const occupied = plannerEntry(occupiedEvent, { kind: "assignment" });
    const onMove = vi.fn();
    render(<DayTimeline {...timelineProps} entries={[planned, done, skipped, occupied]} onMove={onMove} />);

    expect(screen.getAllByRole("button", { name: "Sposta Ripasso" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Sposta Occupato" })).not.toBeInTheDocument();
  });

  it("annulla lo spostamento pointer prima dei 300 ms se il gesto supera 8 px", () => {
    vi.useFakeTimers();
    const entry = plannerEntry(studyEvent());
    const onMove = vi.fn();
    render(<DayTimeline {...timelineProps} entries={[entry]} onMove={onMove} />);
    const slot = screen.getByRole("listitem", { name: /Studio, Biologia, Ripasso/ });

    fireEvent.pointerDown(slot, { pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(slot, { pointerId: 1, clientX: 100, clientY: 109 });
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.pointerUp(slot, { pointerId: 1, button: 0, clientX: 100, clientY: 109 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("trascina dopo long press con snap a cinque minuti e annulla con Escape", () => {
    vi.useFakeTimers();
    const entry = plannerEntry(studyEvent());
    const onMove = vi.fn();
    const onMoveInteractionChange = vi.fn();
    render(<DayTimeline {...timelineProps} entries={[entry]} onMove={onMove} onMoveInteractionChange={onMoveInteractionChange} />);
    const slot = screen.getByRole("listitem", { name: /Studio, Biologia, Ripasso/ });

    fireEvent.pointerDown(slot, { pointerId: 2, isPrimary: true, button: 0, clientX: 100, clientY: 100 });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.pointerMove(slot, { pointerId: 2, clientX: 100, clientY: 108 });
    expect(screen.getByText("15:05")).toBeVisible();
    fireEvent.pointerUp(slot, { pointerId: 2, button: 0, clientX: 100, clientY: 108 });
    expect(onMove).toHaveBeenCalledWith(entry, { date: dateKey, time: "15:05" });
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(1, true);
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(2, false);

    onMove.mockClear();
    fireEvent.pointerDown(slot, { pointerId: 3, isPrimary: true, button: 0, clientX: 100, clientY: 100 });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(slot, { pointerId: 3, button: 0, clientX: 100, clientY: 108 });
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.pointerDown(slot, { pointerId: 4, isPrimary: true, button: 0, clientX: 100, clientY: 100 });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.pointerCancel(slot, { pointerId: 4, button: 0, clientX: 100, clientY: 108 });
    fireEvent.pointerUp(slot, { pointerId: 4, button: 0, clientX: 100, clientY: 108 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("conferma con tastiera Alt+frecce, Enter ed emette un annuncio live", () => {
    const entry = plannerEntry(studyEvent());
    const onMove = vi.fn();
    const onMoveInteractionChange = vi.fn();
    render(<DayTimeline {...timelineProps} entries={[entry]} onMove={onMove} onMoveInteractionChange={onMoveInteractionChange} />);
    const slot = screen.getByRole("listitem", { name: /Studio, Biologia, Ripasso/ });
    slot.focus();

    fireEvent.keyDown(slot, { key: "ArrowDown", altKey: true });
    fireEvent.keyDown(slot, { key: "ArrowRight", altKey: true });
    expect(screen.getByText("martedì 3 novembre alle 15:15.")).toBeVisible();
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.keyDown(slot, { key: "Enter" });
    expect(onMove).toHaveBeenCalledWith(entry, { date: "2026-11-03", time: "15:15" });
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(1, true);
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(2, false);

    fireEvent.keyDown(slot, { key: "ArrowDown", altKey: true });
    fireEvent.keyDown(slot, { key: "Escape" });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(3, true);
    expect(onMoveInteractionChange).toHaveBeenNthCalledWith(4, false);
  });

  it("mostra il toast di errore con Riprova e ritenta solo dopo l'azione esplicita", async () => {
    const event = studyEvent();
    mocks.events = [event];
    mocks.applyChanges.mockRejectedValueOnce(new Error("network_error")).mockResolvedValueOnce(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/app?tab=piano&view=day&planDay=${dateKey}`]}>
          <PianoView hasFiles={false} onUploadClick={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sposta Ripasso" }));
    fireEvent.change(screen.getByLabelText("Nuovo orario"), { target: { value: "15:05" } });
    fireEvent.click(screen.getByRole("button", { name: "Sposta" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(1));
    const errorToast = mocks.toast.mock.calls[0][0] as {
      title: string;
      action: {
        props: {
          children: unknown;
          onClick?: (event: { preventDefault: () => void }) => void;
        };
      };
    };
    expect(errorToast.title).toBe("Non sono riuscito a spostarla. È rimasta alle 15:00.");
    expect(errorToast.action.props.children).toBe("Riprova");
    expect(mocks.applyChanges).toHaveBeenCalledTimes(1);

    await act(async () => {
      errorToast.action.props.onClick?.({ preventDefault: vi.fn() } as never);
    });
    await waitFor(() => expect(mocks.applyChanges).toHaveBeenCalledTimes(2));
  });

  it("applica un solo pacchetto manuale con versione, lock e dati originali", async () => {
    const event = studyEvent();
    mocks.events = [event];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/app?tab=piano&view=day&planDay=${dateKey}`]}>
          <PianoView hasFiles={false} onUploadClick={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sposta Ripasso" }));
    fireEvent.change(screen.getByLabelText("Nuovo orario"), { target: { value: "15:05" } });
    const save = screen.getByRole("button", { name: "Sposta" });
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => expect(mocks.applyChanges).toHaveBeenCalledTimes(1));
    const request = mocks.applyChanges.mock.calls[0][0] as {
      reason: string;
      changes: Array<Record<string, unknown>>;
    };
    expect(request.reason).toBe("manual");
    expect(request.changes).toHaveLength(1);
    expect(request.changes[0]).toMatchObject({
      op: "update",
      event_id: event.id,
      version: 6,
      before: { event_time: "15:00", locked: false, version: 6 },
      after: {
        event_date: dateKey,
        event_time: "15:05",
        end_time: "16:05",
        locked: true,
        move_count: 3,
        original_date: dateKey,
        original_time: "15:00",
        source: "manual",
      },
    });
  });
});
