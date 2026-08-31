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

const STREAK_NAME = "Apri le statistiche della serie: 4 giorni";
const SETTINGS_NAME = "Apri Impostazioni";

describe("AppHeader", () => {
  it("mostra il titolo a sinistra e i controlli a destra", () => {
    renderHeader("Titolo di sezione molto lungo che deve restringersi");
    const heading = screen.getByRole("heading");
    const streak = screen.getByRole("button", { name: STREAK_NAME });
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });

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
    expect(screen.getByRole("button", { name: STREAK_NAME })).toBeInTheDocument();
  });

  it("nella Home il wordmark 'erga' sta a sinistra, serie e impostazioni a destra", () => {
    renderHeader(null, "/app", true);
    const wordmark = screen.getByText("erga");
    const streak = screen.getByRole("button", { name: STREAK_NAME });
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });
    const row = wordmark.parentElement?.parentElement;

    // Il wordmark apre la riga (gruppo di sinistra) e non è un heading:
    // l'unico h1 della Home resta il saluto.
    expect(wordmark.tagName).toBe("P");
    expect(row?.firstElementChild).toBe(wordmark.parentElement);

    // Serie e impostazioni chiudono la riga, nello stesso gruppo di destra.
    expect(streak.parentElement).toBe(settings.parentElement);
    expect(row?.lastElementChild).toBe(settings.parentElement);

    // Stesso padding orizzontale sui due lati: lo stacco del wordmark dal
    // bordo sinistro è identico a quello dei controlli dal bordo destro.
    expect(row?.className).toContain("px-4");
    expect(row?.className).toContain("sm:px-6");

    // L'overlay della Home non deve intercettare i tocchi fuori dai controlli.
    expect(streak.className).toContain("pointer-events-auto");
  });

  it("il wordmark 'erga' compare solo sulla Home, mai sulle altre sezioni", () => {
    renderHeader("Studio");
    expect(screen.queryByText("erga")).not.toBeInTheDocument();
  });

  it("fuori dalla Home tiene la serie accanto alle impostazioni, a destra del titolo", () => {
    renderHeader("Studio");
    const streak = screen.getByRole("button", { name: STREAK_NAME });
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });

    expect(streak.parentElement).toBe(settings.parentElement);
  });

  it.each([
    "/app/impostazioni",
    "/app/impostazioni/aspetto",
    "/settings",
    "/settings/appearance",
  ])("nasconde il pulsante impostazioni nella rotta %s", (route) => {
    renderHeader("Impostazioni", route);
    expect(screen.queryByRole("button", { name: SETTINGS_NAME })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: STREAK_NAME })).toBeInTheDocument();
  });

  it("apre le statistiche Focus dalla serie", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: STREAK_NAME }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/ritmo");
  });

  it("apre le Impostazioni dal tasto ingranaggio, senza parametri di sessione", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: SETTINGS_NAME }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });
});
