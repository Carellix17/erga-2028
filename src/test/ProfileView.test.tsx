import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileView } from "@/components/profile/ProfileView";

vi.mock("@/hooks/useCognitiveProfile", () => ({
  useCognitiveProfile: () => ({
    profile: null,
    hasCompletedOnboarding: true,
    isLoaded: true,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProfileData", () => ({
  INSTITUTES: [],
  SCHOOLS: [],
  useProfileData: () => ({
    fileInputRef: { current: null },
    firstName: "Vale",
    lastName: "",
    nickname: "",
    age: "",
    school: "licei_cartesio",
    avatarPreview: null,
    avatarUrl: "",
    isUploadingAvatar: false,
    institute: "liceo_scientifico",
    isLoading: false,
    isSaving: false,
    saved: false,
    dirty: false,
    handleAvatarChange: vi.fn(),
    handleSave: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentEmail: "vale@example.com",
    currentUser: "user-1",
    isGoogleUser: false,
    logout: vi.fn(),
    session: null,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "beta",
    isPro: false,
    isBetaTester: true,
    hasActiveSubscription: false,
    loading: false,
  }),
}));

vi.mock("@/components/subscription/SubscriptionSheet", () => ({
  SubscriptionSheet: () => <div data-testid="subscription-sheet" />,
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderProfile(route = "/app/profilo") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ProfileView onOpenCognitive={vi.fn()} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("ProfileView ripristinata", () => {
  it("mostra avatar, nome, badge piano e scheda Esagono Cognitivo", () => {
    renderProfile();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vale");
    expect(screen.getByRole("button", { name: "Cambia foto profilo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /beta/i })).toBeInTheDocument();
    expect(screen.getByText("Esagono Cognitivo")).toBeInTheDocument();
    expect(screen.getByText("Calcola il tuo Esagono Cognitivo")).toBeInTheDocument();
  });

  it("ha Impostazioni in alto a destra e apre /app/impostazioni", () => {
    renderProfile();
    const settings = screen.getByRole("button", { name: "Impostazioni" });
    fireEvent.click(settings);
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
  });

  it("ha il pulsante di uscita in alto a destra", () => {
    renderProfile();
    expect(screen.getByRole("button", { name: "Esci dall'account" })).toBeInTheDocument();
  });

  it("offre il ritorno alla Home (indietro) senza rompere la cronologia", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Indietro" }));
    // In un MemoryRouter senza cronologia precedente si torna ad /app
    expect(screen.getByTestId("location")).toHaveTextContent("/app");
  });
});
