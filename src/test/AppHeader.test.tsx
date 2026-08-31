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
    const streak = screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" });
    const profile = screen.getByRole("button", { name: "Apri il tuo profilo" });

    expect(heading).toHaveClass("truncate", "text-left");
    expect(heading.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(streak.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" })).toBeInTheDocument();
  });

  it("nella Home ancora la serie a sinistra e il profilo a destra, con lo stesso stacco dai bordi", () => {
    renderHeader(null, "/app", true);
    const streak = screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" });
    const profile = screen.getByRole("button", { name: "Apri il tuo profilo" });
    const row = streak.parentElement?.parentElement;

    // La serie apre la riga (gruppo di sinistra), il profilo la chiude.
    expect(streak.parentElement).not.toBe(profile.parentElement);
    expect(row).toBe(profile.parentElement?.parentElement);
    expect(row?.firstElementChild).toBe(streak.parentElement);
    expect(row?.lastElementChild).toBe(profile.parentElement);

    // Stesso padding orizzontale sui due lati: lo stacco dal bordo sinistro
    // della serie è identico a quello del profilo dal bordo destro.
    expect(row?.className).toContain("px-4");
    expect(row?.className).toContain("sm:px-6");

    // L'overlay della Home non deve intercettare i tocchi fuori dai controlli.
    expect(streak.className).toContain("pointer-events-auto");
  });

  it("fuori dalla Home tiene la serie accanto al profilo, a destra del titolo", () => {
    renderHeader("Studio");
    const streak = screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" });
    const profile = screen.getByRole("button", { name: "Apri il tuo profilo" });

    expect(streak.parentElement).toBe(profile.parentElement);
  });

  it.each([
    "/app/impostazioni",
    "/app/impostazioni/aspetto",
    "/settings",
    "/settings/appearance",
  ])("nasconde il pulsante profilo nella rotta %s", (route) => {
    renderHeader("Impostazioni", route);
    expect(screen.queryByRole("button", { name: "Apri il tuo profilo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" })).toBeInTheDocument();
  });

  it("apre le statistiche Focus dalla serie", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Apri le statistiche della serie: 4 giorni" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/ritmo");
  });

  it("apre la rotta protetta del profilo senza parametri di sessione", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Apri il tuo profilo" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/profilo");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });
});
