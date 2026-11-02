import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PianoView } from "@/components/piano/PianoView";
import { StudyPlanSkeleton } from "@/components/piano/StudyPlanSkeleton";
import i18n from "@/i18n";

const { toast, getSession } = vi.hoisted(() => ({
  toast: vi.fn(),
  getSession: vi.fn(async () => ({ data: { session: { access_token: "test-token" } } })),
}));

vi.mock("@/hooks/useStudyEvents", () => ({
  useStudyEventsQuery: () => ({
    data: [{
      id: "event-1",
      subject: "Fisica",
      title: "Ripasso",
      event_date: "2026-11-05",
      event_time: "16:15",
      event_type: "study",
    }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAddStudyEvents: () => ({ mutateAsync: vi.fn() }),
  useDeleteStudyEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStudyEvent: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useEvaluations", () => ({
  useEvaluations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAddEvaluation: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluation: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "user-1" }) }));
vi.mock("@/hooks/useUserSubjects", () => ({ useUserSubjects: () => ({ data: [] }) }));
vi.mock("@/hooks/useUserRoutines", () => ({ useUserRoutines: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/useFileContexts", () => ({ useFileContextsQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useDelayedLoading", () => ({ useDelayedLoading: () => false }));
vi.mock("@/utils/haptics", () => ({ triggerHaptic: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession } } }));

beforeEach(async () => {
  await i18n.changeLanguage("it");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: "duplicate key value violates unique constraint" }),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("PianoView friendly errors", () => {
  it("shows a fixed Italian toast and logs technical details for a generation error", async () => {
    render(
      <MemoryRouter initialEntries={["/app?tab=piano"]}>
        <PianoView hasFiles onUploadClick={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Genera piano di studio" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Errore",
      description: "Errore nella generazione del piano",
      variant: "destructive",
    })));
    expect(JSON.stringify(toast.mock.calls)).not.toContain("duplicate");
    expect(console.error).toHaveBeenCalledWith(
      "Error generating plan:",
      expect.objectContaining({ message: "duplicate key value violates unique constraint" }),
    );
  });

  it("labels the planner skeleton and mirrors its six cards, 42 square cells, and two actions", () => {
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
