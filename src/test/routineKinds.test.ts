import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  routines: [] as unknown[],
  addRoutine: vi.fn(async () => undefined),
  updateRoutine: vi.fn(async () => undefined),
  deleteRoutine: vi.fn(async () => undefined),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useUserRoutines", () => ({
  useUserRoutines: () => ({ data: mocks.routines, isLoading: false }),
  useAddUserRoutine: () => ({ mutateAsync: mocks.addRoutine, isPending: false }),
  useUpdateUserRoutine: () => ({ mutateAsync: mocks.updateRoutine, isPending: false }),
  useDeleteUserRoutine: () => ({ mutateAsync: mocks.deleteRoutine, isPending: false }),
}));

vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/piano/PlannerSettingsSheet", () => ({ PlannerSettingsSheet: () => null }));

import { WeeklyRoutineEditor } from "@/components/core/WeeklyRoutineEditor";
import { freeWindows } from "@/lib/planner/freeTime";
import {
  findRoutineConflict,
  ROUTINE_KINDS,
  routineTimesForSave,
  type UserRoutine,
} from "@/lib/routineLayout";

const noStudyRoutine: UserRoutine = {
  id: "no-study-monday",
  user_id: "user-1",
  kind: "no_study",
  label: null,
  start_time: "00:00:00",
  end_time: "23:59:00",
  days_of_week: [1],
};

const schoolRoutine: UserRoutine = {
  id: "school-monday",
  user_id: "user-1",
  kind: "school",
  label: "School",
  start_time: "08:00:00",
  end_time: "13:00:00",
  days_of_week: [1],
};

beforeEach(() => {
  mocks.routines = [];
  mocks.addRoutine.mockReset().mockResolvedValue(undefined);
  mocks.updateRoutine.mockReset().mockResolvedValue(undefined);
  mocks.deleteRoutine.mockReset().mockResolvedValue(undefined);
  mocks.toast.mockReset();
});

describe("tipi di routine del piano", () => {
  it("include trasporto e giorno senza studio", () => {
    expect(ROUTINE_KINDS.map(({ value }) => value)).toEqual([
      "school",
      "sleep",
      "meal",
      "other",
      "transport",
      "no_study",
    ]);
  });

  it("salva il giorno senza studio come giornata intera e lascia invariati gli orari del trasporto", () => {
    expect(routineTimesForSave("no_study", "08:00", "13:00")).toEqual({
      start_time: "00:00",
      end_time: "23:59",
    });
    expect(routineTimesForSave("transport", "15:10", "15:40")).toEqual({
      start_time: "15:10",
      end_time: "15:40",
    });
  });

  it("non considera il marcatore senza studio un conflitto con gli altri impegni", () => {
    expect(findRoutineConflict({
      kind: "no_study",
      startTime: "00:00",
      endTime: "23:59",
      days: [1],
    }, [schoolRoutine])).toBeNull();

    expect(findRoutineConflict({
      kind: "transport",
      startTime: "08:30",
      endTime: "09:00",
      days: [1],
    }, [noStudyRoutine])).toBeNull();
  });

  it("restituisce zero finestre di studio per il giorno no_study", () => {
    const windows = freeWindows("2026-11-09", [{
      kind: "no_study",
      start_time: "00:00",
      end_time: "23:59",
      days_of_week: [1],
    }]);
    expect(windows).toEqual([]);
  });

  it("salva i trasporti con gli orari scelti", async () => {
    render(createElement(WeeklyRoutineEditor));
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi blocco" }));
    fireEvent.click(screen.getByRole("button", { name: "Trasporto" }));
    fireEvent.change(screen.getByLabelText("Inizio"), { target: { value: "15:10" } });
    fireEvent.change(screen.getByLabelText("Fine"), { target: { value: "15:40" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(mocks.addRoutine).toHaveBeenCalledWith({
      kind: "transport",
      label: null,
      start_time: "15:10",
      end_time: "15:40",
      days_of_week: [1, 2, 3, 4, 5],
    }));
  });

  it("salva il giorno senza studio all-day per i giorni selezionati anche se esistono altri impegni", async () => {
    mocks.routines = [schoolRoutine];
    render(createElement(WeeklyRoutineEditor));
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi blocco" }));
    fireEvent.click(screen.getByRole("button", { name: "Giorno senza studio" }));
    expect(screen.getByText("Tutto il giorno")).toBeInTheDocument();
    expect(screen.queryByLabelText("Inizio")).not.toBeInTheDocument();

    for (const day of ["Martedì", "Mercoledì", "Giovedì", "Venerdì"]) {
      fireEvent.click(screen.getByRole("button", { name: day }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(mocks.addRoutine).toHaveBeenCalledWith({
      kind: "no_study",
      label: null,
      start_time: "00:00",
      end_time: "23:59",
      days_of_week: [1],
    }));
  });
});
