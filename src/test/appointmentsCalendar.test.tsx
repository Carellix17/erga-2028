import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, addMonths, format } from "date-fns";
import { it as italianLocale } from "date-fns/locale";
import { AppointmentsCalendar } from "@/components/piano/AppointmentsCalendar";
import type { StudyEvent } from "@/hooks/useStudyEvents";

const today = new Date();
const events: StudyEvent[] = [
  { id: "today", title: "Ripasso di fisica", subject: "Fisica", event_date: format(today, "yyyy-MM-dd"), event_time: "15:30", event_type: "study" },
  { id: "future", title: "Verifica di italiano", subject: "Italiano", event_date: format(addDays(today, 1), "yyyy-MM-dd"), event_type: "test" },
];
const props = {
  evaluations: [], events, subjects: [], exitingIds: [], onAddEvent: vi.fn(), showGeneratePlan: true,
  onGeneratePlan: vi.fn(), isGeneratingPlan: false, onEditEvaluation: vi.fn(), onEditStudyEvent: vi.fn(),
  onDeleteEvaluation: vi.fn(), onDeleteStudyEvent: vi.fn(),
};
afterEach(cleanup);
describe("agenda first planner", () => {
  it("shows today's activity and future deadlines immediately", () => {
    render(<AppointmentsCalendar {...props} />);
    expect(screen.getByText("Ripasso di fisica")).toBeVisible();
    expect(screen.getByText("Verifica di italiano")).toBeVisible();
    expect(screen.getByRole("button", { name: "Genera piano di studio" })).toBeEnabled();
  });
  it("filters dates only on deliberate selection and restores the complete agenda", () => {
    render(<AppointmentsCalendar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Oggi" }));
    expect(screen.queryByText("Verifica di italiano")).not.toBeInTheDocument();
    expect(screen.getByText("Ripasso di fisica")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Tutti i prossimi" }));
    expect(screen.getByText("Verifica di italiano")).toBeVisible();
  });
  it("has keyboard-operable calendar dates and explicit month navigation", () => {
    render(<AppointmentsCalendar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-expanded", "true");
    const todayButton = document.querySelector<HTMLButtonElement>('button[aria-current="date"]')!;
    todayButton.focus();
    expect(todayButton).toHaveFocus();
    fireEvent.mouseEnter(todayButton);
    expect(screen.getByText("Verifica di italiano")).toBeInTheDocument();
    fireEvent.click(todayButton);
    expect(screen.queryByText("Verifica di italiano")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mese successivo" }));
    expect(screen.getByRole("heading", { name: format(addMonths(today, 1), "MMMM yyyy", { locale: italianLocale }) })).toBeVisible();
  });
  it("keeps edit and delete available with names identifying the event", () => {
    render(<AppointmentsCalendar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica Ripasso di fisica" }));
    expect(props.onEditStudyEvent).toHaveBeenCalledWith(events[0]);
    fireEvent.click(screen.getByRole("button", { name: "Elimina Verifica di italiano" }));
    expect(props.onDeleteStudyEvent).toHaveBeenCalledWith(events[1]);
  });
  it("explains empty days and keeps generation disabled until there are commitments", () => {
    render(<AppointmentsCalendar {...props} events={[]} showGeneratePlan={false} />);
    expect(screen.getByRole("button", { name: "Genera piano di studio" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Oggi" }));
    expect(screen.getByText("Nessun impegno per questo giorno.")).toBeVisible();
  });
});
