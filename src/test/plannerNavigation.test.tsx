import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  it("defaults to today's day view and canonicalizes the query without adding a history entry", async () => {
    renderRoute([`/app?tab=piano`]);

    expect(screen.getByRole("radio", { name: "Giorno" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("heading", { name: `${format(today, "EEEE d MMMM", { locale: italianLocale }).replace(/^./, (letter) => letter.toLocaleUpperCase())}` })).toBeVisible();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`tab=piano&view=day&planDay=${todayKey}`));
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

    fireEvent.click(screen.getByRole("button", { name: "Indietro browser" }));
    expect(screen.getByText("Pagina iniziale")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/app?tab=home");
  });

  it("loads the week from view=week and shows the selected day and its written study load", () => {
    renderRoute([`/app?tab=piano&view=week&planDay=${todayKey}`]);

    expect(screen.getByRole("radio", { name: "Settimana" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("region", { name: "Vista settimanale" })).toBeVisible();
    const strip = screen.getByRole("navigation", { name: "Giorni della settimana e carico di studio" });
    const todayButton = within(strip).getByRole("button", { name: /carico di studio: 2 h 30/i });
    expect(todayButton).toHaveAttribute("aria-current", "date");
    expect(screen.getByText("2 h 30")).toBeVisible();
    expect(screen.getByText("Ripasso settimanale")).toBeVisible();
  });

  it("pushes an opened slot and browser Back restores the same week without the dialog", () => {
    renderRoute([`/app?tab=piano&view=week&planDay=${todayKey}`]);

    fireEvent.click(screen.getByRole("button", { name: /Apri i dettagli: Studio, 09:00, Fisica, Ripasso settimanale/ }));
    expect(screen.getByTestId("location")).toHaveTextContent(`view=week&planDay=${todayKey}&slot=week-study`);
    expect(screen.getByRole("dialog")).toBeVisible();

    fireEvent.click(screen.getByTestId("browser-back"));
    expect(screen.getByRole("region", { name: "Vista settimanale" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).not.toHaveTextContent("slot=");
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
    const markers = todayButton.querySelector(".planner-day-markers");
    expect(markers).toHaveAttribute("aria-hidden", "true");
    expect(markers?.querySelectorAll("[data-marker-kind]")).toHaveLength(3);
    expect(markers?.querySelector('[data-marker-kind="evaluation"]')).toBeInTheDocument();
    expect(markers?.querySelector('[data-marker-kind="study"]')).toBeInTheDocument();
    expect(markers?.querySelector('[data-marker-kind="commitment"]')).toBeInTheDocument();
  });
});
