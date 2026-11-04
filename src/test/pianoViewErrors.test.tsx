import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { MemoryRouter } from "react-router-dom";
import { PianoView } from "@/components/piano/PianoView";
import { StudyPlanSkeleton } from "@/components/piano/StudyPlanSkeleton";
import type { ScheduleEvaluation } from "@/lib/planner/schedule";
import type { EvalFormInput } from "@/components/piano/AddEventSheet";
import i18n from "@/i18n";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  addEvaluation: vi.fn(),
  updateEvaluation: vi.fn(),
  applyChanges: vi.fn(),
  plannerData: {
    value: null as unknown,
    listeners: new Set<() => void>(),
  },
}));

function publishPlannerData(data: unknown) {
  mocks.plannerData.value = data;
  for (const listener of mocks.plannerData.listeners) listener();
}

function makeEvaluation(overrides: Partial<ScheduleEvaluation> = {}): ScheduleEvaluation {
  return {
    id: "eval-1",
    title: "Verifica di Fisica",
    date: format(addDays(new Date(), 5), "yyyy-MM-dd"),
    is_completed: false,
    topic_type: "free",
    topic_id: null,
    subject_id: "subject-1",
    subject: "Fisica",
    ...overrides,
  };
}

function plannerData(evaluations: ScheduleEvaluation[]) {
  return {
    evaluations,
    events: [],
    buildPlanInput: ({ today, horizonDays, evaluations: selectedEvaluations }: {
      today: Date;
      horizonDays: number;
      evaluations: readonly ScheduleEvaluation[];
    }) => ({
      today,
      horizonDays,
      evaluations: selectedEvaluations,
      lessonsByContext: {},
      completedByContext: {},
      estimateFn: () => 20,
      routines: [],
      busyEvents: [],
      existingSlots: [],
      settings: {},
    }),
  };
}

vi.mock("@/hooks/usePlannerData", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    usePlannerData: () => {
      const data = React.useSyncExternalStore(
        (listener) => {
          mocks.plannerData.listeners.add(listener);
          return () => mocks.plannerData.listeners.delete(listener);
        },
        () => mocks.plannerData.value,
        () => mocks.plannerData.value,
      );
      return { data, isLoading: false, isError: false, refetch: vi.fn(async () => ({ data })) };
    },
    plannerDataKeys: { all: (userId: string | null) => ["planner-data", userId] },
  };
});

vi.mock("@/hooks/useStudyEvents", () => ({
  studyEventsKeys: { all: (userId: string | null) => ["study-events", userId] },
  PlanConflictError: class PlanConflictError extends Error {},
  useStudyEventsQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddStudyEvents: () => ({ mutateAsync: vi.fn() }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
  useApplyPlanChanges: () => ({ mutateAsync: mocks.applyChanges, isPending: false }),
}));
vi.mock("@/hooks/usePlanChanges", () => ({
  planChangesKeys: { all: (userId: string | null) => ["plan-changes", userId] },
  usePlanChanges: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: mocks.addEvaluation }),
  useUpdateEvaluation: () => ({ mutateAsync: mocks.updateEvaluation }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/piano/AddEventSheet", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    AddEventSheet: ({ open, onOpenChange, onSubmit }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onSubmit: (input: EvalFormInput, editingId: string | null) => Promise<void>;
    }) => open ? React.createElement("button", {
      type: "button",
      onClick: async () => {
        await onSubmit({
          type: "orale",
          title: "Verifica di Fisica",
          date: format(addDays(new Date(), 5), "yyyy-MM-dd"),
          subject_id: "subject-1",
          topic_type: "free",
          free_topic_title: "Fisica",
          category: "verifica",
        }, null);
        onOpenChange(false);
      },
    }, "Salva verifica") : null,
  };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "user-1" }) }));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useUserRoutines", () => ({ useUserRoutines: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast, dismiss: vi.fn() }) }));
vi.mock("@/hooks/useSlotReminders", () => ({ useSlotReminders: vi.fn() }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/utils/haptics", () => ({ triggerHaptic: vi.fn() }));

function renderPiano() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app?tab=piano"]}>
        <PianoView hasFiles onUploadClick={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("it");
  publishPlannerData(null);
  mocks.addEvaluation.mockReset();
  mocks.updateEvaluation.mockReset();
  mocks.applyChanges.mockReset();
  mocks.toast.mockReset();
});

afterEach(() => {
  cleanup();
  mocks.plannerData.listeners.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PianoView plan proposals", () => {
  it("prepares an automatic proposal after saving a test without writing slots or calling generate-plan", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const savedEvaluation = makeEvaluation();
    mocks.addEvaluation.mockImplementation(async () => {
      publishPlannerData(plannerData([savedEvaluation]));
    });

    renderPiano();
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi evento" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva verifica" }));

    const bannerText = await screen.findByText(/Ho preparato un piano per la verifica di Fisica del/);
    const banner = bannerText.closest('[role="status"]') as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner).toBeVisible();
    expect(mocks.addEvaluation).toHaveBeenCalledTimes(1);
    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(within(banner).getByRole("button", { name: "Vedi" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Applica 3 modifiche" })).toBeEnabled();
    expect(mocks.applyChanges).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not leave an automatic banner behind a manually opened preview", async () => {
    publishPlannerData(plannerData([makeEvaluation()]));
    renderPiano();

    expect(await screen.findByText(/Ho preparato un piano per la verifica di Fisica del/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Prepara il piano" }));

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.queryByText(/Ho preparato un piano per la verifica di Fisica del/)).not.toBeInTheDocument();
  });

  it("still renders the accessible planner skeleton with six cards and 42 square cells", () => {
    const { container } = render(<StudyPlanSkeleton />);
    const status = screen.getByRole("status", { name: "Caricamento del piano…" });
    const cells = container.querySelectorAll(".planner-month-grid > div");

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".planner-deadlines > li")).toHaveLength(6);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toHaveClass("aspect-square", "rounded-none", "border", "border-border");
    expect(container.querySelectorAll(".planner-actions > div")).toHaveLength(2);
    expect(container.querySelector(".max-w-lg")).toBeNull();
  });
});
