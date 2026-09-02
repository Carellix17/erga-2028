import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";

import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SettingsAccessibility from "@/pages/settings/SettingsAccessibility";
import SettingsAccount from "@/pages/settings/SettingsAccount";
import SettingsAppearance from "@/pages/settings/SettingsAppearance";
import SettingsLanguage from "@/pages/settings/SettingsLanguage";
import SettingsTerms from "@/pages/settings/SettingsTerms";

vi.mock("@/hooks/useHomeDashboard", () => ({
  useHomeDashboard: () => ({ data: { streakDays: 0 } }),
}));

vi.mock("@/hooks/useProfileData", () => ({
  INSTITUTES: [{ value: "liceo_scientifico", label: "Liceo Scientifico" }],
  SCHOOLS: [{ value: "licei_cartesio", label: "Licei Cartesio" }],
  useProfileData: () => ({
    fileInputRef: { current: null },
    firstName: "",
    setFirstName: vi.fn(),
    lastName: "",
    setLastName: vi.fn(),
    nickname: "",
    setNickname: vi.fn(),
    age: "",
    setAge: vi.fn(),
    school: "licei_cartesio",
    setSchool: vi.fn(),
    avatarPreview: null,
    isUploadingAvatar: false,
    avatarUrl: "",
    institute: "liceo_scientifico",
    setInstitute: vi.fn(),
    isLoading: false,
    isSaving: false,
    saved: false,
    dirty: false,
    setDirty: vi.fn(),
    handleAvatarChange: vi.fn(),
    handleSave: vi.fn(),
  }),
}));

vi.mock("@/components/profile/NotificationsCard", () => ({
  NotificationsCard: () => <section aria-label="Notifiche" />,
}));

// La scheda "Accesso e sicurezza" arriva dal Core e porta i suoi hook.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentEmail: "vale@example.com",
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

// La scheda "Accesso e sicurezza" è arrivata dal Core: porta con sé i suoi hook.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentEmail: "vale@example.com",
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

function renderSettingsPage(ui: React.ReactElement, route: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>
          <AccessibilityProvider>{ui}</AccessibilityProvider>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("pagine impostazioni", () => {
  it.each([
    ["Generale", <SettingsAccount />, "/app/impostazioni/account"],
    ["Lingua", <SettingsLanguage />, "/app/impostazioni/lingua"],
    ["Aspetto", <SettingsAppearance />, "/app/impostazioni/aspetto"],
    ["Accessibilità", <SettingsAccessibility />, "/app/impostazioni/accessibilita"],
    ["Termini e condizioni", <SettingsTerms />, "/app/impostazioni/termini"],
  ])("renderizza la sezione %s senza attivare l'ErrorBoundary", (title, component, route) => {
    renderSettingsPage(component, route);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByText("Ops, qualcosa è andato storto")).not.toBeInTheDocument();
  });
});

describe("Generale — accesso e sicurezza (spostato fuori dal Core)", () => {
  it("tiene email, cambio password e uscita a portata di mano", () => {
    renderSettingsPage(<SettingsAccount />, "/app/impostazioni/account");

    expect(screen.getByRole("heading", { name: "Accesso e sicurezza" })).toBeInTheDocument();
    expect(screen.getByText("vale@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambia password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esci dall'account/i })).toBeInTheDocument();
  });
});


describe("Impostazioni → Generale: accesso e sicurezza", () => {
  it("ospita email, cambio password e uscita (spostati fuori dal Core)", () => {
    renderSettingsPage(<SettingsAccount />, "/app/impostazioni/account");

    expect(screen.getByRole("heading", { name: "Accesso e sicurezza" })).toBeInTheDocument();
    expect(screen.getByText("vale@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambia password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esci dall'account/i })).toBeInTheDocument();
  });
});
