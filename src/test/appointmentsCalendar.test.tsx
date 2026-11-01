import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, addMonths, format } from "date-fns";
import { it as italianLocale } from "date-fns/locale";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppointmentsCalendar } from "@/components/piano/AppointmentsCalendar";
import type { StudyEvent } from "@/hooks/useStudyEvents";

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
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("calendar and daily schedule", () => {
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
    expect(screen.getByRole("heading", { name: format(today, "EEEE d MMMM", { locale: italianLocale }) })).toHaveFocus();
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
    expect(screen.getByRole("heading", { name: format(addMonths(today, 1), "MMMM yyyy", { locale: italianLocale }) })).toBeVisible();
  });
});
