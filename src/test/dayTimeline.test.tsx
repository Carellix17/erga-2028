import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { DayTimeline } from "@/components/piano/DayTimeline";
import type { PlannerEntry } from "@/lib/plannerEntries";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserRoutine } from "@/hooks/useUserRoutines";

vi.mock("@/hooks/useLessons", () => ({
  useLessonsQuery: () => ({ data: { lessons: Array.from({ length: 7 }, (_, lesson_order) => ({ lesson_order })), completed: [0, 1, 2] } }),
}));

const dateKey = "2026-11-02";
const routine = (overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id: "school-monday",
  user_id: "student",
  kind: "school",
  label: "Scuola",
  start_time: "08:00:00",
  end_time: "13:30:00",
  days_of_week: [1],
  ...overrides,
});

function studyEntry(overrides: Partial<PlannerEntry> = {}): PlannerEntry {
  const original: StudyEvent = {
    id: "bio-slot",
    subject: "Biologia",
    title: "Da Minilezione 1 a 7",
    event_date: dateKey,
    event_time: "15:00",
    end_time: "16:58",
    event_type: "study",
    context_id: "biology-context",
    lesson_from: 0,
    lesson_to: 6,
    source: "auto",
    status: "planned",
    move_count: 0,
  };
  return {
    id: original.id,
    kind: "study",
    date: new Date(2026, 10, 2),
    time: "15:00",
    title: "Da Minilezione 1 a 7",
    subject: "Biologia",
    coverName: "Biologia",
    important: false,
    completed: false,
    endTime: "16:58",
    status: "planned",
    contextId: "biology-context",
    lessonFrom: 0,
    lessonTo: 6,
    source: "auto",
    moveCount: 0,
    original: { kind: "studyEvent", data: original },
    ...overrides,
  };
}

function personalEntry(id: string, time: string, endTime: string, title: string): PlannerEntry {
  const original: StudyEvent = {
    id,
    subject: "Altro",
    title,
    event_date: dateKey,
    event_time: time,
    end_time: endTime,
    event_type: "assignment",
    status: "planned",
    move_count: 0,
  };
  return {
    id,
    kind: "personal",
    date: new Date(2026, 10, 2),
    time,
    title,
    subject: null,
    coverName: "Altro",
    important: false,
    completed: false,
    endTime,
    status: "planned",
    contextId: null,
    lessonFrom: null,
    lessonTo: null,
    moveCount: 0,
    original: { kind: "studyEvent", data: original },
  };
}

const defaultProps = {
  dateKey,
  entries: [] as PlannerEntry[],
  exitingIds: [] as string[],
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  routines: [] as UserRoutine[],
  routinesLoading: false,
};

beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("DayTimeline", () => {
  it("usa pauses() per suddividere studio e pause conservando il nome accessibile dell'intero slot", () => {
    const now = new Date("2026-11-02T14:30:00+01:00");
    render(<DayTimeline {...defaultProps} entries={[studyEntry()]} now={now} />);

    const list = screen.getByRole("list", { name: "Slot della giornata in ordine cronologico" });
    const firstStudyBlock = within(list).getByRole("listitem", {
      name: /Studio, Biologia.*Minilezione 1 a 7.*15:00.*16:58.*stima 1 ora e 38 minuti.*Non iniziato/i,
    });
    expect(firstStudyBlock).toBeVisible();
    expect(within(list).getAllByRole("listitem", { name: /Pausa [12]/ })).toHaveLength(2);
    expect(within(list).getAllByRole("listitem", { name: /Studio/ })).toHaveLength(3);
    expect(screen.getByRole("status", { name: "Adesso 14:30" })).toBeVisible();
  });

  it("mostra la routine scuola 08:00–13:30 in sola lettura e senza azioni", () => {
    const now = new Date("2026-11-01T12:00:00+01:00");
    render(<DayTimeline {...defaultProps} routines={[routine()]} now={now} />);

    const school = screen.getByRole("listitem", { name: /Routine, Scuola.*08:00.*13:30.*sola lettura/i });
    expect(school).toHaveAttribute("data-slot-kind", "routine");
    expect(school).toHaveAttribute("data-readonly", "true");
    expect(school.querySelectorAll("[data-slot-icon='routine'] svg")).toHaveLength(2);
    expect(within(school).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("now-line")).not.toBeInTheDocument();
  });

  it("conserva Modifica ed Elimina per gli eventi dell'utente", () => {
    const entry = studyEntry({ endTime: null, lessonFrom: null, lessonTo: null, title: "Ripasso" });
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const now = new Date("2026-11-01T12:00:00+01:00");
    render(<DayTimeline {...defaultProps} entries={[entry]} routines={[routine()]} onEdit={onEdit} onDelete={onDelete} now={now} />);

    const userSlot = screen.getByRole("listitem", { name: /Studio, Biologia, Ripasso/ });
    fireEvent.click(within(userSlot).getByRole("button", { name: "Modifica Ripasso" }));
    fireEvent.click(within(userSlot).getByRole("button", { name: "Elimina Ripasso" }));
    expect(onEdit).toHaveBeenCalledWith(entry);
    expect(onDelete).toHaveBeenCalledWith(entry);
    const school = screen.getByRole("listitem", { name: /Routine, Scuola/ });
    expect(within(school).queryByRole("button")).not.toBeInTheDocument();
  });

  it("allarga la fascia per includere gli impegni Altro prima della sveglia e dopo il sonno", () => {
    const early = personalEntry("early-other", "06:30", "06:50", "Allenamento presto");
    const late = personalEntry("late-other", "23:15", "23:45", "Rientro tardi");
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const now = new Date("2026-11-02T12:00:00+01:00");
    const { container } = render(<DayTimeline {...defaultProps} entries={[early, late]} onEdit={onEdit} onDelete={onDelete} now={now} />);

    const list = screen.getByRole("list", { name: "Slot della giornata in ordine cronologico" });
    const earlySlot = within(list).getByRole("listitem", { name: /Altro, Allenamento presto.*06:30.*06:50/i });
    const lateSlot = within(list).getByRole("listitem", { name: /Altro, Rientro tardi.*23:15.*23:45/i });
    expect(earlySlot).toBeVisible();
    expect(lateSlot).toBeVisible();
    fireEvent.click(within(earlySlot).getByRole("button", { name: "Modifica Allenamento presto" }));
    fireEvent.click(within(earlySlot).getByRole("button", { name: "Elimina Allenamento presto" }));
    fireEvent.click(within(lateSlot).getByRole("button", { name: "Modifica Rientro tardi" }));
    fireEvent.click(within(lateSlot).getByRole("button", { name: "Elimina Rientro tardi" }));
    expect(onEdit).toHaveBeenNthCalledWith(1, early);
    expect(onDelete).toHaveBeenNthCalledWith(1, early);
    expect(onEdit).toHaveBeenNthCalledWith(2, late);
    expect(onDelete).toHaveBeenNthCalledWith(2, late);

    const grid = container.querySelector(".planner-day-grid")!;
    const hourLabels = container.querySelectorAll(".planner-day-hour-label");
    expect(grid).toHaveAttribute("data-start-minute", "360");
    expect(grid).toHaveAttribute("data-end-minute", "1440");
    expect(hourLabels[0]).toHaveTextContent("06:00");
    expect(hourLabels[hourLabels.length - 1]).toHaveTextContent("24:00");
  });

  it("include gli impegni serali oltre il sonno della routine", () => {
    const sleep = routine({ id: "sleep-monday", kind: "sleep", label: "Sonno", start_time: "22:00:00", end_time: "07:00:00" });
    const late = personalEntry("late-near-bedtime", "22:30", "22:45", "Allenamento tardi");
    const now = new Date("2026-11-01T12:00:00+01:00");
    const { container } = render(<DayTimeline {...defaultProps} entries={[late]} routines={[sleep]} now={now} />);

    expect(screen.getByRole("listitem", { name: /Altro, Allenamento tardi.*22:30.*22:45/i })).toBeVisible();
    const grid = container.querySelector(".planner-day-grid")!;
    expect(grid).toHaveAttribute("data-end-minute", "1380");
    expect(container.querySelectorAll(".planner-day-hour-label")).toHaveLength(17);
    expect(container.querySelector(".planner-day-hour-label:last-child")).toHaveTextContent("23:00");
  });

  it("disegna NowLine solo per oggi e non introduce scroll interno sotto lg", () => {
    const now = new Date("2026-11-02T10:45:00+01:00");
    const inRangeEvent = personalEntry("in-range", "10:00", "10:30", "Impegno in fascia");
    const { container, rerender } = render(<DayTimeline {...defaultProps} entries={[inRangeEvent]} now={now} />);

    expect(screen.getByRole("status", { name: "Adesso 10:45" })).toBeVisible();
    const dayTimeline = screen.getByTestId("day-timeline");
    const grid = container.querySelector(".planner-day-grid")!;
    const track = container.querySelector(".planner-day-grid-track")!;
    expect(grid).toHaveAttribute("data-start-minute", "420");
    expect(grid).toHaveAttribute("data-end-minute", "1380");
    const hourLabels = container.querySelectorAll(".planner-day-hour-label");
    expect(hourLabels).toHaveLength(17);
    expect(hourLabels[0]).toHaveTextContent("07:00");
    expect(hourLabels[16]).toHaveTextContent("23:00");
    expect(getComputedStyle(dayTimeline).overflowY).toBe("visible");
    expect(getComputedStyle(track).overflowY).toBe("visible");
    expect(document.querySelector(".planner-day-grid")).not.toHaveClass("overflow-y-auto");

    rerender(<DayTimeline {...defaultProps} dateKey="2026-11-03" entries={[]} now={now} />);
    expect(screen.queryByTestId("now-line")).not.toBeInTheDocument();

    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain(".planner-day-timeline { --planner-day-hour-height: 6rem");
    expect(css).toMatch(/\.planner-day-timeline[^{}]*\{[^}]*overflow:\s*visible/);
    expect(css).toContain("@media (min-width: 1024px) { .planner-day-timeline { --planner-day-hour-height: 5rem; }");
  });

  it("announces a free day with only a verification, but not when there is a study slot", () => {
    const now = new Date("2026-11-01T12:00:00+01:00");
    const verification = studyEntry({
      id: "history-test",
      kind: "evaluation",
      title: "Verifica di storia",
      subject: "Storia",
      time: "10:00",
      endTime: "11:00",
      lessonFrom: null,
      lessonTo: null,
    });
    const { rerender } = render(<DayTimeline {...defaultProps} entries={[verification]} now={now} />);
    expect(screen.getByText("Giorno libero")).toBeVisible();

    rerender(<DayTimeline {...defaultProps} entries={[verification, studyEntry()]} now={now} />);
    expect(screen.queryByText("Giorno libero")).not.toBeInTheDocument();
  });

  it("shows partial lesson progress from the saved course record", () => {
    const entry = studyEntry({ status: "partial", endTime: null });
    const now = new Date("2026-11-01T12:00:00+01:00");
    render(<DayTimeline {...defaultProps} entries={[entry]} now={now} />);

    expect(screen.getByRole("listitem", { name: /Parziale.*3 di 7 fatte/i })).toBeVisible();
  });
});
