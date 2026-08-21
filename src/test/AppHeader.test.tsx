import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/layout/AppHeader";

vi.mock("@/hooks/useHomeDashboard", () => ({
  useHomeDashboard: () => ({ data: { streakDays: 4 } }),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderHeader(title: string | null = "Studio", route = "/app") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppHeader title={title} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("AppHeader", () => {
  it("mostra titolo e streak con token semantici", () => {
    renderHeader("Titolo di sezione molto lungo che deve restringersi");
    expect(screen.getByRole("heading")).toHaveClass("truncate");
    expect(screen.getByLabelText("4 giorni")).toBeInTheDocument();
  });

  it("nasconde il titolo nella Home", () => {
    renderHeader(null);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("apre la rotta protetta delle impostazioni senza parametri di sessione", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Apri Impostazioni" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });
});
