import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn();
  builder.upsert = vi.fn();
  return {
    currentUser: "user-1",
    isPro: false,
    row: null as Record<string, unknown> | null,
    subjects: [{ id: "subject-1", user_id: "user-1", name: "Biologia", color: null }],
    builder,
    from: vi.fn(() => builder),
    toast: vi.fn(),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: mocks.currentUser }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ isPro: mocks.isPro }),
}));

vi.mock("@/hooks/useUserSubjects", () => ({
  useUserSubjects: () => ({ data: mocks.subjects, isLoading: false, isError: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import { PlannerSettingsSheet } from "@/components/piano/PlannerSettingsSheet";
import { usePlannerSettings } from "@/hooks/usePlannerSettings";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mocks.currentUser = "user-1";
  mocks.isPro = false;
  mocks.row = null;
  mocks.subjects = [{ id: "subject-1", user_id: "user-1", name: "Biologia", color: null }];
  mocks.from.mockClear();
  mocks.builder.select.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.eq.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.maybeSingle.mockReset().mockImplementation(async () => ({ data: mocks.row, error: null }));
  mocks.builder.upsert.mockReset().mockResolvedValue({ error: null });
  mocks.toast.mockReset();
});

describe("usePlannerSettings e impostazioni del piano", () => {
  it("usa i default quando planner_settings non contiene una riga", async () => {
    const { result } = renderHook(() => usePlannerSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.settings).toMatchObject({
      user_id: "user-1",
      lessons_per_block: 3,
      short_break_min: 5,
      medium_break_min: 10,
      long_break_min: 20,
      max_block_min: 50,
      daily_limit_school_min: 180,
      daily_limit_free_min: 300,
      ask_before_move: false,
      sound_enabled: true,
      subject_types: {},
    });
  });

  it("impedisce a un utente Free di salvare lessons_per_block", async () => {
    const { result } = renderHook(() => usePlannerSettings(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await expect(result.current.saveSettings({ lessons_per_block: 4 }))
        .rejects.toThrow(/Pro plan required/);
    });
    expect(mocks.builder.upsert).not.toHaveBeenCalled();
  });

  it("permette a un utente Pro di salvare lessons_per_block", async () => {
    mocks.isPro = true;
    const { result } = renderHook(() => usePlannerSettings(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.saveSettings({ lessons_per_block: 4 });
    });

    expect(mocks.builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", lessons_per_block: 4 }),
      { onConflict: "user_id" },
    );
    await waitFor(() => expect(result.current.settings.lessons_per_block).toBe(4));
  });

  it("mostra i campi Pro in sola lettura a Free e salva solo le impostazioni consentite", async () => {
    render(<PlannerSettingsSheet open onOpenChange={vi.fn()} />, { wrapper: createWrapper() });

    const lessonsPerBlock = await screen.findByLabelText("Minilezioni per blocco");
    expect(lessonsPerBlock).toBeDisabled();
    expect(screen.getByLabelText("Pausa breve")).toBeDisabled();
    expect(screen.getByLabelText("Pausa media")).toBeDisabled();
    expect(screen.getByLabelText("Pausa lunga")).toBeDisabled();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText(/sola lettura con il piano Free/i)).toBeInTheDocument();
    expect(screen.getByText("Biologia")).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Limite nei giorni di scuola"), { target: { value: "210" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(mocks.builder.upsert).toHaveBeenCalledTimes(1));
    const payload = mocks.builder.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ user_id: "user-1", daily_limit_school_min: 210 });
    expect(payload).not.toHaveProperty("lessons_per_block");
    expect(payload).not.toHaveProperty("short_break_min");
  });
});
