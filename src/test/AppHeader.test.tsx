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

function renderHeader(title: string | null = "Studio", route = "/app", integratedHome = false) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppHeader title={title} integratedHome={integratedHome} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("AppHeader", () => {
  it("mostra il titolo a sinistra e i controlli a destra", () => {
    renderHeader("Titolo di sezione molto lungo che deve restringersi");
    const heading = screen.getByRole("heading");
    const streak = screen.getByLabelText("4 giorni");
    const settings = screen.getByRole("button", { name: "Apri Impostazioni" });

    expect(heading).toHaveClass("truncate", "text-left");
    expect(heading.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(streak.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("non mostra linee o ombre di separazione sotto l'header", () => {
    renderHeader();
    const header = screen.getByRole("banner");

    expect(header.className).not.toContain("border-b");
    expect(header.className).not.toContain("border-border");
    expect(header.className).not.toContain("shadow-");
  });

  it("integra i controlli nella prima riga della Home senza una fascia vuota", () => {
    renderHeader(null, "/app", true);
    const header = screen.getByRole("banner");

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(header).toHaveClass("absolute", "bg-transparent");
    expect(header).not.toHaveClass("sticky");
    expect(screen.getByLabelText("4 giorni")).toBeInTheDocument();
  });

  it.each([
    "/app/impostazioni",
    "/app/impostazioni/aspetto",
    "/settings",
    "/settings/appearance",
  ])("nasconde il pulsante Impostazioni nella rotta %s", (route) => {
    renderHeader("Impostazioni", route);
    expect(screen.queryByRole("button", { name: "Apri Impostazioni" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("4 giorni")).toBeInTheDocument();
  });

  it("apre la rotta protetta delle impostazioni senza parametri di sessione", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Apri Impostazioni" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });
});
