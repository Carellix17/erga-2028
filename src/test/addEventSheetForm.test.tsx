import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddEventSheet, type EvalFormInput } from "@/components/piano/AddEventSheet";
import type { Evaluation } from "@/hooks/useEvaluations";
import i18n from "@/i18n";

vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));

const evaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: "evaluation-1",
  user_id: "user-1",
  subject_id: null,
  type: "scritta",
  title: "Verifica di prova",
  description: null,
  date: new Date(2026, 10, 4, 9, 0).toISOString(),
  topic_type: "free",
  topic_id: null,
  free_topic_title: null,
  goal: null,
  is_completed: false,
  created_at: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
};

const renderSheet = (overrides: { initial?: Evaluation | null; presetCategory?: "verifica" | "compito" | "altro"; presetDate?: string } = {}) => {
  const onSubmit = vi.fn(async (_input: EvalFormInput, _editingId: string | null) => undefined);
  const onOpenChange = vi.fn((_open: boolean) => undefined);
  render(<AddEventSheet open onOpenChange={onOpenChange} onSubmit={onSubmit} {...overrides} />);
  return { onSubmit, onOpenChange };
};

beforeEach(async () => {
  setViewportWidth(1024);
  await i18n.changeLanguage("it");
});

afterEach(async () => {
  cleanup();
  setViewportWidth(1024);
  await i18n.changeLanguage("it");
  vi.clearAllMocks();
});

describe("AddEventSheet form behaviour", () => {
  it("keeps submit enabled, shows every required error and focuses the first invalid field", async () => {
    const { onSubmit } = renderSheet();
    const submit = await screen.findByRole("button", { name: "Salva evento" });
    const title = screen.getByLabelText("Titolo");
    const date = screen.getByLabelText("Data");
    const endTime = screen.getByLabelText("Ora fine (obbligatorio)");

    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(title).toHaveFocus();
    expect(title).toHaveAttribute("aria-required", "true");
    expect(date).toHaveAttribute("aria-required", "true");
    expect(endTime).toHaveAttribute("aria-required", "true");
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(date).toHaveAttribute("aria-invalid", "true");
    expect(endTime).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(title.getAttribute("aria-describedby")!)).toHaveTextContent("Inserisci un titolo");
    expect(document.getElementById(date.getAttribute("aria-describedby")!)).toHaveTextContent("Seleziona una data");
    expect(screen.getByText("Inserisci l'ora di fine")).toBeVisible();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Inserisci un titolo");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills one hour for Verifica, tracks manual end-time edits, and never prefills Altro", async () => {
    renderSheet();
    const startTime = await screen.findByLabelText("Ora inizio");
    const endTime = screen.getByLabelText("Ora fine (obbligatorio)");
    expect(endTime).toHaveValue("");

    fireEvent.change(startTime, { target: { value: "15:00" } });
    expect(endTime).toHaveValue("16:00");
    fireEvent.change(startTime, { target: { value: "15:30" } });
    expect(endTime).toHaveValue("16:30");
    fireEvent.change(endTime, { target: { value: "17:00" } });
    fireEvent.change(startTime, { target: { value: "14:00" } });
    expect(endTime).toHaveValue("17:00");

    cleanup();
    renderSheet({ presetCategory: "altro" });
    const altroStartTime = await screen.findByLabelText("Ora inizio");
    const altroEndTime = screen.getByLabelText("Ora fine (opzionale)");
    fireEvent.change(altroStartTime, { target: { value: "15:00" } });
    expect(altroEndTime).toHaveValue("");
  });

  it("keeps the P47 end-time requirement when both times are blank", async () => {
    const { onSubmit } = renderSheet();
    fireEvent.change(await screen.findByLabelText("Titolo"), { target: { value: "Verifica" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-04" } });
    const endTime = screen.getByLabelText("Ora fine (obbligatorio)");
    fireEvent.click(screen.getByRole("button", { name: "Salva evento" }));

    expect(screen.getByText("Inserisci l'ora di fine")).toHaveAttribute("role", "alert");
    expect(endTime).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("extracts an existing end-time suffix and appends it exactly once on save", async () => {
    const { onSubmit } = renderSheet({ initial: evaluation({ description: "Ripasso · fino alle 10:00" }) });
    const notes = await screen.findByLabelText("Note (opzionale)");
    const endTime = screen.getByLabelText("Ora fine (opzionale)");
    expect(notes).toHaveValue("Ripasso");
    expect(endTime).toHaveValue("10:00");
    fireEvent.change(screen.getByLabelText("Ora inizio"), { target: { value: "08:00" } });
    expect(endTime).toHaveValue("10:00");

    fireEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.description).toBe("Ripasso · fino alle 10:00");
    expect(submitted.description?.match(/fino alle 10:00/g)).toHaveLength(1);
  });

  it("also recognizes the English until suffix", async () => {
    await i18n.changeLanguage("en");
    const { onSubmit } = renderSheet({ initial: evaluation({ description: "Review until 10:00" }) });
    expect(await screen.findByLabelText("Notes (optional)")).toHaveValue("Review");
    expect(screen.getByLabelText("End time (optional)")).toHaveValue("10:00");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].description).toBe("Review · until 10:00");
  });

  it("does not render the goal slider until the student chooses to set a goal", async () => {
    renderSheet();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Aggiungi note/ }));
    expect(screen.getByRole("button", { name: "Imposta obiettivo" })).toBeVisible();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imposta obiettivo" }));
    expect(await screen.findByRole("slider")).toBeVisible();
  });

  it("opens from the right on desktop and from the bottom on mobile", async () => {
    const { unmount } = render(<AddEventSheet open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const desktopDialog = await screen.findByRole("dialog");
    await waitFor(() => expect(desktopDialog).toHaveClass("right-0"));
    expect(desktopDialog).toHaveClass("w-full", "sm:max-w-md");
    unmount();

    setViewportWidth(390);
    render(<AddEventSheet open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const mobileDialog = await screen.findByRole("dialog");
    await waitFor(() => expect(mobileDialog).toHaveClass("inset-x-0", "bottom-0"));
  });
});
