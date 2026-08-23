import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

function renderSettingsPage(ui: React.ReactElement, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <AccessibilityProvider>{ui}</AccessibilityProvider>
      </ThemeProvider>
    </MemoryRouter>,
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
