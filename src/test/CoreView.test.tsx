import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CoreView } from "@/components/core/CoreView";

// jsdom non ha ResizeObserver (usato dai cursori Radix): stub minimale.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

type CognitiveSaveArg = Record<string, string | number | null | undefined>;
const saveCognitive = vi.fn(async (_data: CognitiveSaveArg) => true);
const openDiagnostic = vi.fn();
const updateInterests = vi.fn();

// Profilo stabile: stesso riferimento a ogni render, come l'hook reale.
const cognitiveProfile = {
  nome: "Vale",
  eta: 16,
  istituto: null,
  log_score: 70,
  mem_score: 60,
  foc_score: 80,
  voc_score: 55,
  ans_score: 40,
  app_score: 65,
};

vi.mock("@/hooks/useCognitiveProfile", () => ({
  useCognitiveProfile: () => ({
    profile: cognitiveProfile,
    hasCompletedOnboarding: true,
    isLoaded: true,
    refresh: vi.fn(),
    save: saveCognitive,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useUserSubjects", () => ({
  useUserSubjects: () => ({ data: [], isLoading: false }),
  useAddUserSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUserSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSubjectColor: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useUserRoutines", () => ({
  useUserRoutines: () => ({ data: [], isLoading: false }),
  useAddUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUserRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useUserData", () => ({
  useUserData: () => ({ data: [], updateData: updateInterests, isLoaded: true }),
}));

vi.mock("@/hooks/useProfileData", () => ({
  useProfileData: () => ({
    fileInputRef: { current: null },
    firstName: "Vale",
    setFirstName: vi.fn(),
    lastName: "",
    setLastName: vi.fn(),
    nickname: "Vale",
    setNickname: vi.fn(),
    avatarPreview: null,
    isUploadingAvatar: false,
    isLoading: false,
    isSaving: false,
    dirty: false,
    setDirty: vi.fn(),
    handleAvatarChange: vi.fn(),
    handleSave: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentEmail: "vale@example.com",
    isGoogleUser: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "beta" }),
}));

// Radar recharts: sostituito per non dipendere dalle misure del viewport in jsdom.
vi.mock("@/components/core/CognitiveRadar", () => ({
  CognitiveRadar: () => <div data-testid="cognitive-radar" />,
}));

vi.mock("@/components/subscription/SubscriptionSheet", () => ({
  SubscriptionSheet: () => <div data-testid="subscription-sheet" />,
}));

function renderCore() {
  return render(
    <MemoryRouter>
      <CoreView onOpenCognitive={openDiagnostic} />
    </MemoryRouter>,
  );
}

describe("CoreView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra le quattro sezioni del Core", () => {
    renderCore();
    expect(screen.getByRole("tab", { name: "Esagono" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Materie" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Routine" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Account" })).toBeInTheDocument();
  });

  it("parte dalla scheda Esagono con i valori del profilo", () => {
    renderCore();
    expect(screen.getByRole("tabpanel", { hidden: false })).toHaveAttribute("id", "core-panel-esagono");
    expect(screen.getByTestId("cognitive-radar")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument(); // Focus
  });

  it("apre il pannello di calibrazione con 6 cursori e salva", async () => {
    renderCore();
    fireEvent.click(screen.getByRole("button", { name: /Aggiusta parametri/i }));
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(6);

    // Muove il cursore del Focus (80 → 81+) e salva
    const focus = screen.getByRole("slider", { name: "Focus" });
    fireEvent.keyDown(focus, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: /Salva parametri/i }));
    expect(await vi.waitFor(() => expect(saveCognitive).toHaveBeenCalledTimes(1)));
    const firstCall = saveCognitive.mock.calls.at(0);
    expect(firstCall).toBeDefined();
    const arg = (firstCall as unknown as [CognitiveSaveArg])[0];
    expect(arg.foc_score).toBeGreaterThan(80);
    expect(arg).toMatchObject({ nome: "Vale", eta: 16 }); // i dati anagrafici non si perdono
    expect(arg).toHaveProperty("log_score");
    expect(arg).toHaveProperty("app_score");
  });

  it("il pulsante diagnostico apre il questionario", () => {
    renderCore();
    fireEvent.click(screen.getByRole("button", { name: /Rifai il test/i }));
    expect(openDiagnostic).toHaveBeenCalledTimes(1);
  });

  it("nella scheda Materie aggiunge un interesse e mostra i vuoti guidati", () => {
    renderCore();
    fireEvent.click(screen.getByRole("tab", { name: "Materie" }));
    expect(screen.getByText(/Nessuna materia aggiunta/i)).toBeInTheDocument();

    const input = screen.getByLabelText("Aggiungi interesse");
    fireEvent.change(input, { target: { value: "Scacchi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(updateInterests).toHaveBeenCalledWith(["Scacchi"]);
  });

  it("nella scheda Routine mostra lo stato vuoto guidato", () => {
    renderCore();
    fireEvent.click(screen.getByRole("tab", { name: "Routine" }));
    expect(screen.getByText("Nessuna attività programmata.")).toBeInTheDocument();
    expect(
      screen.getByText(/Aggiungi i tuoi orari di sport o pasti per ottimizzare lo studio/i),
    ).toBeInTheDocument();
  });

  it("nella scheda Account mostra email, cambio password e uscita", () => {
    renderCore();
    fireEvent.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.getByLabelText(/^email/i)).toHaveValue("vale@example.com");
    expect(screen.getByRole("button", { name: /Cambia password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esci dall'account/i })).toBeInTheDocument();
  });

  it("cambia scheda anche da tastiera (frecce)", () => {
    renderCore();
    const esagono = screen.getByRole("tab", { name: "Esagono" });
    esagono.focus();
    fireEvent.keyDown(esagono, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Materie" })).toHaveAttribute("aria-selected", "true");
  });
});
