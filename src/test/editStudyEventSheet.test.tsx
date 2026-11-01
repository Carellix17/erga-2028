import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditStudyEventSheet } from "@/components/piano/EditStudyEventSheet";
import type { StudyEvent, UpdateStudyEventInput } from "@/hooks/useStudyEvents";

const event = (overrides: Partial<StudyEvent> = {}): StudyEvent => ({
  id: "event-1",
  subject: "Fisica",
  title: "Ripasso",
  event_date: "2026-11-02",
  event_time: "17:00",
  event_type: "study",
  end_time: "18:30",
  notes: "Capitolo 2",
  version: 1,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EditStudyEventSheet optional details", () => {
  it("prefills and saves edited notes and end time", async () => {
    const onSave = vi.fn<(input: UpdateStudyEventInput) => Promise<void>>().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<EditStudyEventSheet event={event({ event_type: "assignment" })} onOpenChange={onOpenChange} onSave={onSave} />);

    const endTime = await screen.findByLabelText("Ora fine (opzionale)");
    const notes = screen.getByLabelText("Note (opzionale)");
    expect(endTime).toHaveValue("18:30");
    expect(notes).toHaveValue("Capitolo 2");

    fireEvent.change(endTime, { target: { value: "19:15" } });
    fireEvent.change(notes, { target: { value: "  Ripassare le formule  " } });
    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "Ripasso aggiornato" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      id: "event-1",
      subject: "Fisica",
      title: "Ripasso aggiornato",
      date: "2026-11-02",
      time: "17:00",
      type: "assignment",
      endTime: "19:15",
      notes: "Ripassare le formule",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("omits end time and notes when the fields are cleared", async () => {
    const onSave = vi.fn<(input: UpdateStudyEventInput) => Promise<void>>().mockResolvedValue(undefined);
    render(<EditStudyEventSheet event={event()} onOpenChange={vi.fn()} onSave={onSave} />);

    fireEvent.change(await screen.findByLabelText("Ora fine (opzionale)"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Note (opzionale)"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const input = onSave.mock.calls[0][0];
    expect(input).not.toHaveProperty("endTime");
    expect(input).not.toHaveProperty("notes");
  });
});
