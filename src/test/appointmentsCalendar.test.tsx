import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, addMonths, format } from "date-fns";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { it as italianLocale } from "date-fns/locale";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppointmentsCalendar } from "@/components/piano/AppointmentsCalendar";
import { PianoView } from "@/components/piano/PianoView";
import type { StudyEvent } from "@/hooks/useStudyEvents";

const { addStudyEventsMutateAsync, toast } = vi.hoisted(() => ({
  addStudyEventsMutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useStudyEvents", () => ({
  studyEventsKeys: { all: (userId: string | null) => ["study-events", userId] },
  PlanConflictError: class PlanConflictError extends Error {},
  useStudyEventsQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddStudyEvents: () => ({ mutateAsync: addStudyEventsMutateAsync }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
  useApplyPlanChanges: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluation: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleEvaluationCompleted: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: null }) }));
vi.mock("@/hooks/usePlannerData", () => ({
  usePlannerData: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useUserRoutines", () => ({ useUserRoutines: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useSlotReminders", () => ({ useSlotReminders: vi.fn() }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/utils/haptics", () => ({ triggerHaptic: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const capitalizeFirstLetter = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);
const today = new Date();
const key = format(today, "yyyy-MM-dd");
const events: StudyEvent[] = [
  { id: "today", title: "Ripasso di fisica", subject: "Fisica", event_date: key, event_time: "15:30", event_type: "study" },
  { id: "extra", title: "Allenamento", subject: "Altro", event_date: key, event_time: "18:00", event_type: "assignment" },
  { id: "all-day", title: "Consegna ricerca", subject: "Storia", event_date: key, event_type: "assignment" },
  { id: "future", title: "Verifica di italiano", subject: "Italiano", event_date: format(addDays(today, 1), "yyyy-MM-dd"), event_type: "test" },
];
const props = {
  evaluations: [], events, subjects: [], exitingIds: [], onAddEvent: vi.fn(), showGeneratePlan: true,
  onPreparePlan: vi.fn(), isPreparingPlan: false, onOpenHistory: vi.fn(), onEditEvaluation: vi.fn(), onEditStudyEvent: vi.fn(),
  onDeleteEvaluation: vi.fn(), onDeleteStudyEvent: vi.fn(),
};
const Location = () => <output data-testid="location">{useLocation().search}</output>;
const mount = (overrides = {}, url = "/app?tab=piano&view=month") => render(<MemoryRouter initialEntries={[url]}><AppointmentsCalendar {...props} {...overrides} /><Location /></MemoryRouter>);
const mountPiano = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app?tab=piano"]}><PianoView hasFiles={false} onUploadClick={vi.fn()} /></MemoryRouter>
    </QueryClientProvider>,
  );
};
const openAltroSheet = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
  fireEvent.click(await screen.findByRole("radio", { name: "Altro" }));
};
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("calendar and daily schedule", () => {
  it("capitalizes only the first letter of a selected day and its month", () => {
    mount({}, "/app?tab=piano&planDay=2026-11-01");

    expect(screen.getByRole("heading", { name: "Novembre 2026" })).toBeVisible();
    fireEvent.click(document.querySelector('button[data-day-key="2026-11-01"]')!);
    expect(screen.getByRole("heading", { name: "Domenica 1 novembre" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(screen.getByRole("heading", { name: "Novembre 2026" })).toBeVisible();
  });

  it("lists the month under the calendar and can hide that list", async () => {
    mount();

    expect(screen.queryByRole("heading", { name: "Prossime verifiche" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Impegni del mese" })).toBeVisible();
    expect(screen.getByText("Verifica di italiano")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Nascondi gli impegni" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Impegni del mese" })).not.toBeInTheDocument());
  });

  it("keeps localized narrow and abbreviated weekday labels in the month grid header", () => {
    const { container } = mount();
    const weekdayRow = container.querySelector(".planner-month-weekdays[role=\"row\"]");
    expect(weekdayRow).not.toBeNull();

    const cells = Array.from(weekdayRow!.querySelectorAll(":scope > span"));
    expect(cells).toHaveLength(7);
    expect(cells.map((cell) => cell.children[0]?.textContent)).toEqual(["L", "M", "M", "G", "V", "S", "D"]);
    expect(cells.map((cell) => cell.children[1]?.textContent)).toEqual(["lun", "mar", "mer", "gio", "ven", "sab", "dom"]);
  });

  it("keeps the add and plan actions with the month", () => {
    mount();
    const calendar = screen.getByRole("region", { name: "Calendario" });
    expect(within(calendar).getAllByRole("button").length).toBeGreaterThan(30);
    expect(screen.getByRole("button", { name: "Prepara il piano" })).toBeEnabled();
    const add = screen.getByRole("button", { name: "Aggiungi evento" });
    expect(add.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("does not offer the change history from the planner", () => {
    mount();
    expect(screen.queryByRole("button", { name: "Altre azioni del piano" })).not.toBeInTheDocument();
  });

  it("opens today's full schedule, with other events and a separate untimed section", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
    expect(props.onAddEvent).toHaveBeenCalledWith(key);
    fireEvent.click(document.querySelector('button[aria-current="date"]')!);
    const day = screen.getByRole("dialog");
    expect(within(day).getByText("Ripasso di fisica")).toBeVisible();
    expect(within(day).getByText("Allenamento")).toBeVisible();
    expect(within(day).getByText("Consegna ricerca")).toBeVisible();
    expect(within(day).getByText("15:30")).toBeVisible();
    expect(document.querySelectorAll("[data-hour]")).toHaveLength(17);
    const romeHour = Number(new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/Rome",
    }).format(new Date()));
    if (romeHour >= 7 && romeHour < 23) {
      expect(screen.getByTestId("now-line")).toHaveTextContent(/^Adesso/);
    } else {
      expect(screen.queryByTestId("now-line")).not.toBeInTheDocument();
    }
    expect(screen.getByTestId("location")).toHaveTextContent(`tab=piano&view=day&planDay=${key}`);
  });
  it("opens an explicitly selected date, navigates days and returns to the same month", () => {
    mount();
    const day = document.querySelector<HTMLButtonElement>('button[aria-current="date"]')!;
    day.focus();
    fireEvent.click(day);
    expect(screen.getByRole("heading", { name: capitalizeFirstLetter(format(today, "EEEE d MMMM", { locale: italianLocale })) })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Giorno successivo" }));
    const nextDay = screen.getByRole("dialog");
    expect(within(nextDay).queryByText("Allenamento")).not.toBeInTheDocument();
    expect(within(nextDay).getByText("Verifica di italiano")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(document.querySelector('button[aria-current="date"]')).toHaveFocus();
    expect(screen.getByRole("region", { name: "Calendario" })).toBeVisible();
  });
  it("edits and deletes a commitment from the month list", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Modifica Ripasso di fisica" }));
    expect(props.onEditStudyEvent).toHaveBeenCalledWith(events[0]);
    fireEvent.click(screen.getByRole("button", { name: "Elimina Ripasso di fisica" }));
    expect(props.onDeleteStudyEvent).toHaveBeenCalledWith(events[0]);
  });
  it("saves Altro notes and end time, rejects an end time at or before the start, and avoids duplicate optional labels", async () => {
    addStudyEventsMutateAsync.mockResolvedValue({});
    mountPiano();
    await openAltroSheet();

    const endTime = screen.getByLabelText("Ora fine (opzionale)");
    expect(endTime).toHaveValue("");
    expect(screen.getByLabelText("Note (opzionale)")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "Allenamento pallavolo" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-02" } });
    fireEvent.change(screen.getByLabelText("Ora inizio"), { target: { value: "17:00" } });
    fireEvent.change(endTime, { target: { value: "16:00" } });
    fireEvent.change(screen.getByLabelText("Note (opzionale)"), { target: { value: "  Portare scarpe  " } });
    fireEvent.click(screen.getByRole("button", { name: "Salva evento" }));

    expect(screen.getByRole("alert")).toHaveTextContent("L'ora di fine deve essere dopo l'ora di inizio");
    expect(addStudyEventsMutateAsync).not.toHaveBeenCalled();

    fireEvent.change(endTime, { target: { value: "18:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva evento" }));
    await waitFor(() => expect(addStudyEventsMutateAsync).toHaveBeenCalledTimes(1));
    expect(addStudyEventsMutateAsync.mock.calls[0][0]).toEqual([{
      subject: "Altro",
      title: "Allenamento pallavolo",
      date: "2026-11-02",
      time: "17:00",
      type: "assignment",
      notes: "Portare scarpe",
      endTime: "18:30",
    }]);
  });

  it("omits blank notes and end time from the Altro add payload", async () => {
    addStudyEventsMutateAsync.mockResolvedValue({});
    mountPiano();
    await openAltroSheet();
    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "Cena" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva evento" }));

    await waitFor(() => expect(addStudyEventsMutateAsync).toHaveBeenCalledTimes(1));
    const [event] = addStudyEventsMutateAsync.mock.calls[0][0];
    expect(event).not.toHaveProperty("notes");
    expect(event).not.toHaveProperty("endTime");
  });

  it("supports empty calendars, free days and direct daily URLs", () => {
    mount({ events: [], showGeneratePlan: false }, `/app?tab=piano&view=day&planDay=${key}`);
    expect(screen.getByText("Giorno libero")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(screen.getByRole("button", { name: "Prepara il piano" })).toBeDisabled();
    expect(document.querySelector('button[aria-current="date"]')).toBeVisible();
    expect(screen.getByText("Nessun impegno in questo mese. Tocca + per aggiungerne uno.")).toBeVisible();
  });

  it("invites adding an event when the month is empty", () => {
    mount({ events: [], evaluations: [] });
    expect(screen.getByText("Nessun impegno in questo mese. Tocca + per aggiungerne uno.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
    expect(props.onAddEvent).toHaveBeenCalled();
  });
  it("ignores malformed date links and supports month navigation", () => {
    mount({}, "/app?tab=piano&view=month&planDay=invalid");
    fireEvent.click(screen.getByRole("button", { name: "Mese successivo" }));
    expect(screen.getByRole("heading", { name: capitalizeFirstLetter(format(addMonths(today, 1), "MMMM yyyy", { locale: italianLocale })) })).toBeVisible();
  });
});
