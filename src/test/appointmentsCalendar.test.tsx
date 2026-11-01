import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, addMonths, format } from "date-fns";
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
  useStudyEventsQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddStudyEvents: () => ({ mutateAsync: addStudyEventsMutateAsync }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluation: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: null }) }));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
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
  onGeneratePlan: vi.fn(), isGeneratingPlan: false, onEditEvaluation: vi.fn(), onEditStudyEvent: vi.fn(),
  onDeleteEvaluation: vi.fn(), onDeleteStudyEvent: vi.fn(),
};
const Location = () => <output data-testid="location">{useLocation().search}</output>;
const mount = (overrides = {}, url = "/app?tab=piano") => render(<MemoryRouter initialEntries={[url]}><AppointmentsCalendar {...props} {...overrides} /><Location /></MemoryRouter>);
const mountPiano = () => render(<MemoryRouter initialEntries={["/app?tab=piano"]}><PianoView hasFiles={false} onUploadClick={vi.fn()} /></MemoryRouter>);
const openAltroSheet = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
  fireEvent.click(await screen.findByRole("radio", { name: "Altro" }));
};
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("calendar and daily schedule", () => {
  it("capitalizes only the first letter of a selected day and its month", () => {
    mount({}, "/app?tab=piano&planDay=2026-11-01");

    expect(screen.getByRole("heading", { name: "Domenica 1 novembre" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(screen.getByRole("heading", { name: "Novembre 2026" })).toBeVisible();
  });

  it("shows one named deadline heading and leaves the list without a duplicate label", () => {
    mount();
    const title = "Verifiche e interrogazioni in arrivo";

    expect(screen.getAllByRole("heading", { name: title })).toHaveLength(1);
    const region = screen.getByRole("region", { name: title });
    expect(within(region).getByRole("heading", { name: title })).toHaveAttribute("id", "planner-deadlines-heading");
    expect(within(region).getByRole("list")).not.toHaveAccessibleName(title);
  });

  it("keeps localized narrow and abbreviated weekday labels inside an aria-hidden row", () => {
    const { container } = mount();
    const weekdayRow = container.querySelector('[aria-hidden="true"].grid-cols-7');
    expect(weekdayRow).not.toBeNull();

    const cells = Array.from(weekdayRow!.querySelectorAll(":scope > span"));
    expect(cells).toHaveLength(7);
    expect(cells.map((cell) => cell.children[0]?.textContent)).toEqual(["L", "M", "M", "G", "V", "S", "D"]);
    expect(cells.map((cell) => cell.children[1]?.textContent)).toEqual(["lun", "mar", "mer", "gio", "ven", "sab", "dom"]);
  });

  it("always exposes the month, upcoming tests, then both actions", () => {
    mount();
    const calendar = screen.getByRole("region", { name: "Calendario" });
    expect(within(calendar).getAllByRole("button").length).toBeGreaterThan(30);
    expect(screen.getByRole("button", { name: /Verifica di italiano, Manca 1 giorno/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Genera piano di studio" })).toBeEnabled();
    const add = screen.getByRole("button", { name: "Aggiungi evento" });
    expect(calendar.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("opens today's full schedule, with other events and a separate untimed section", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Sessione giornaliera" }));
    expect(screen.getByText("Ripasso di fisica")).toBeVisible();
    expect(screen.getByText("Allenamento")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Senza orario" })).getByText("Consegna ricerca")).toBeVisible();
    expect(screen.getByText("15:30")).toBeVisible();
    expect(document.querySelectorAll("[data-hour]")).toHaveLength(24);
    expect(screen.getByTestId("location")).toHaveTextContent(`tab=piano&planDay=${key}`);
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
    expect(props.onAddEvent).toHaveBeenCalledWith(key);
  });
  it("opens an explicitly selected date, navigates days and returns to the same month", () => {
    mount();
    const day = document.querySelector<HTMLButtonElement>('button[aria-current="date"]')!;
    day.focus();
    fireEvent.mouseEnter(day);
    expect(screen.queryByRole("heading", { name: "Ora per ora" })).not.toBeInTheDocument();
    fireEvent.click(day);
    expect(screen.getByRole("heading", { name: capitalizeFirstLetter(format(today, "EEEE d MMMM", { locale: italianLocale })) })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Giorno successivo" }));
    expect(screen.queryByText("Allenamento")).not.toBeInTheDocument();
    expect(screen.getByText("Verifica di italiano")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(document.querySelector('button[aria-current="date"]')).toHaveFocus();
    expect(screen.getByRole("region", { name: "Calendario" })).toBeVisible();
  });
  it("opens a deadline's date and preserves edit/delete callbacks", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Verifica di italiano, Manca 1 giorno/ }));
    fireEvent.click(screen.getByRole("button", { name: "Modifica Verifica di italiano" }));
    expect(props.onEditStudyEvent).toHaveBeenCalledWith(events[3]);
    fireEvent.click(screen.getByRole("button", { name: "Elimina Verifica di italiano" }));
    expect(props.onDeleteStudyEvent).toHaveBeenCalledWith(events[3]);
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

  it("supports empty calendars, empty days and direct daily URLs", () => {
    mount({ events: [], showGeneratePlan: false }, `/app?tab=piano&planDay=${key}`);
    expect(screen.getByText("Nessun impegno per questo giorno.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Torna al calendario" }));
    expect(screen.getByRole("button", { name: "Genera piano di studio" })).toBeDisabled();
    expect(document.querySelector('button[aria-current="date"]')).toBeVisible();
  });
  it("ignores malformed date links and supports month navigation", () => {
    mount({}, "/app?tab=piano&planDay=invalid");
    fireEvent.click(screen.getByRole("button", { name: "Mese successivo" }));
    expect(screen.getByRole("heading", { name: capitalizeFirstLetter(format(addMonths(today, 1), "MMMM yyyy", { locale: italianLocale })) })).toBeVisible();
  });
});
