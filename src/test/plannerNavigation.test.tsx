import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, format } from "date-fns";
import { it as italianLocale } from "date-fns/locale";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { AppointmentsCalendar } from "@/components/piano/AppointmentsCalendar";
import type { StudyEvent } from "@/hooks/useStudyEvents";

vi.mock("@/hooks/useUserRoutines", () => ({
  useUserRoutines: () => ({ data: [], isLoading: false }),
}));

const today = new Date();
const todayKey = format(today, "yyyy-MM-dd");
const events: StudyEvent[] = [
  {
    id: "week-study",
    title: "Ripasso settimanale",
    subject: "Fisica",
    event_date: todayKey,
    event_time: "09:00",
    end_time: "11:30",
    event_type: "study",
  },
  {
    id: "week-test",
    title: "Verifica settimanale",
    subject: "Italiano",
    event_date: todayKey,
    event_type: "test",
  },
  {
    id: "week-personal",
    title: "Allenamento",
    subject: "Altro",
    event_date: todayKey,
    event_time: "18:00",
    event_type: "assignment",
  },
];
const props = {
  evaluations: [],
  events,
  subjects: [],
  exitingIds: [],
  onAddEvent: vi.fn(),
  showGeneratePlan: false,
  onPreparePlan: vi.fn(),
  isPreparingPlan: false,
  onOpenHistory: vi.fn(),
  onEditEvaluation: vi.fn(),
  onEditStudyEvent: vi.fn(),
  onDeleteEvaluation: vi.fn(),
  onDeleteStudyEvent: vi.fn(),
};

function RouteHarness() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  return (
    <>
      <output data-testid="location">{location.pathname}{location.search}</output>
      <button type="button" aria-label="Indietro browser" data-testid="browser-back" onClick={() => navigate(-1)}>Indietro</button>
      {query.get("tab") === "piano" ? <AppointmentsCalendar {...props} /> : <p>Pagina iniziale</p>}
    </>
  );
}

function renderRoute(initialEntries: string[], initialIndex = 0) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <RouteHarness />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("Piano URL navigation and views", () => {
  it("defaults to the month and canonicalizes the query without adding a history entry", async () => {
    renderRoute([`/app?tab=piano`]);

    const monthTitle = format(today, "MMMM yyyy", { locale: italianLocale }).replace(/^./, (letter) => letter.toLocaleUpperCase());
    expect(screen.getByRole("heading", { name: monthTitle })).toBeVisible();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`tab=piano&view=month&planDay=${todayKey}`));
  });

  it("replaces each day change so one browser Back exits the planner instead of revisiting dates", () => {
    renderRoute([
      "/app?tab=home",
      `/app?tab=piano&view=day&planDay=${todayKey}`,
    ], 1);

    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Giorno successivo" }));
    }
    expect(screen.getByTestId("location")).toHaveTextContent(`planDay=${format(addDays(today, 3), "yyyy-MM-dd")}`);

    fireEvent.click(document.querySelector('[data-testid="browser-back"]')!);
    expect(screen.getByText("Pagina iniziale")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/app?tab=home");
  });

  it("shows the selected day's commitments in the month list", async () => {
    renderRoute([`/app?tab=piano&view=week&planDay=${todayKey}`]);

    expect(screen.getByRole("grid", { name: "Calendario mensile" })).toBeVisible();
    expect(screen.getByText("Ripasso settimanale")).toBeVisible();
    expect(screen.getByText("Verifica settimanale")).toBeVisible();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("view=month"));
  });

  it("opens a day in place so browser Back leaves the planner", () => {
    renderRoute([
      "/app?tab=home",
      `/app?tab=piano&view=month&planDay=${todayKey}`,
    ], 1);

    fireEvent.click(document.querySelector(`button[data-day-key="${todayKey}"]`)!);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent(`view=day&planDay=${todayKey}`);

    fireEvent.click(document.querySelector('[data-testid="browser-back"]')!);
    expect(screen.getByText("Pagina iniziale")).toBeVisible();
  });

  it("provides one roving tab stop, moves focus with arrows, and changes month with PageDown", () => {
    const initialDay = "2026-01-15";
    renderRoute([`/app?tab=piano&view=month&planDay=${initialDay}`]);

    const grid = screen.getByRole("grid", { name: "Calendario mensile" });
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
    const initialButton = grid.querySelector<HTMLButtonElement>(`button[data-day-key="${initialDay}"]`)!;
    initialButton.focus();
    fireEvent.keyDown(initialButton, { key: "ArrowRight" });

    const afterArrow = screen.getByRole("grid", { name: "Calendario mensile" })
      .querySelector<HTMLButtonElement>('button[data-day-key="2026-01-16"]')!;
    expect(afterArrow).toHaveAttribute("tabindex", "0");
    expect(afterArrow).toHaveFocus();
    expect(screen.getByTestId("location")).toHaveTextContent("planDay=2026-01-16");
    expect(screen.getByRole("grid", { name: "Calendario mensile" }).querySelectorAll('button[tabindex="0"]')).toHaveLength(1);

    fireEvent.keyDown(afterArrow, { key: "PageDown" });
    const afterPageDown = screen.getByRole("grid", { name: "Calendario mensile" })
      .querySelector<HTMLButtonElement>('button[data-day-key="2026-02-16"]')!;
    expect(screen.getByRole("heading", { name: "Febbraio 2026" })).toBeVisible();
    expect(afterPageDown).toHaveAttribute("tabindex", "0");
    expect(afterPageDown).toHaveFocus();
    expect(screen.getByTestId("location")).toHaveTextContent("planDay=2026-02-16");
  });

  it("marks each month event type and exposes accessible counts", () => {
    renderRoute([`/app?tab=piano&view=month&planDay=${todayKey}`]);

    const grid = screen.getByRole("grid", { name: "Calendario mensile" });
    const todayButton = grid.querySelector<HTMLButtonElement>(`button[data-day-key="${todayKey}"]`)!;
    expect(todayButton).toHaveAccessibleName(/verifiche: 1, studio: 1, impegni: 1/);
    expect(todayButton.querySelector(".planner-day-markers")).toBeNull();
    expect(todayButton).toHaveTextContent("3");
  });
});
