import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/layout/AppHeader";

// La barra mostra il piano (Free/Pro/Beta) accanto al wordmark sulla Home
// del telefono: senza provider di autenticazione nel collaudo, il gancio
// dell'abbonamento va simulato come utente "free".
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isPro: false,
    isBetaTester: false,
    hasActiveSubscription: false,
    loading: false,
  }),
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

const PLAN_NAME = "Piano Free";
const SETTINGS_NAME = "Apri Impostazioni";

/**
 * Barra di stato ridisegnata su decisione del proprietario (6 ottobre 2026):
 * niente più serie né piano nei controlli a destra. Il wordmark «Erga» sta
 * sulla Home; accanto, SOLO sul telefono, il tasto del piano (stesso livello,
 * la scritta non è cliccabile). Il resto della barra è titolo + Impostazioni.
 */
describe("AppHeader", () => {
  it("mostra il titolo a sinistra e le impostazioni a destra, senza serie né piano", () => {
    renderHeader("Titolo di sezione molto lungo che deve restringersi");
    const heading = screen.getByRole("heading");
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });

    expect(heading).toHaveClass("truncate", "text-left");
    expect(screen.queryByRole("button", { name: PLAN_NAME })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /serie/i })).not.toBeInTheDocument();
    expect(heading.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("non mostra linee o ombre di separazione sotto l'header", () => {
    renderHeader();
    const header = screen.getByRole("banner");

    expect(header.className).not.toContain("border-b");
    expect(header.className).not.toContain("border-border");
    expect(header.className).not.toContain("shadow-");
    // nemmeno nella riga interna (niente filetti orizzontali introdotti di nascosto)
    const row = header.firstElementChild;
    expect(row?.className).not.toContain("border-b");
  });

  it("integra i controlli nella prima riga della Home senza una fascia vuota", () => {
    renderHeader(null, "/app", true);
    const header = screen.getByRole("banner");

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(header).toHaveClass("absolute", "bg-transparent");
    expect(header).not.toHaveClass("sticky");
    expect(screen.getByRole("button", { name: PLAN_NAME })).toBeInTheDocument();
  });

  it("nella Home il wordmark Erga e il tasto piano stanno a sinistra sullo stesso livello, impostazioni a destra", () => {
    renderHeader(null, "/app", true);
    const wordmark = screen.getByText("Erga");
    const plan = screen.getByRole("button", { name: PLAN_NAME });
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });
    const row = wordmark.parentElement?.parentElement;

    // Il wordmark apre la riga (gruppo di sinistra) e non è un heading nè
    // un controllo: l'unico h1 della Home resta il saluto.
    expect(wordmark.tagName).toBe("P");
    expect(row?.firstElementChild).toBe(wordmark.parentElement);

    // Il tasto piano è nel MEDESIMO gruppo del wordmark, sullo stesso
    // livello: scritta e tasto dividono la stessa riga di partenza.
    expect(plan.parentElement).toBe(wordmark.parentElement);
    // ...ma solo sul telefono: su desktop la barra è solo la scritta.
    expect(plan.className).toContain("md:hidden");

    // Le impostazioni chiudono la riga nell'altro gruppo.
    expect(row?.lastElementChild).toBe(settings.parentElement);

    // Stesso padding orizzontale sui due lati.
    expect(row?.className).toContain("px-4");
    expect(row?.className).toContain("sm:px-6");

    // L'overlay della Home non deve intercettare i tocchi fuori dai controlli.
    expect(plan.className).toContain("pointer-events-auto");
  });

  it("il wordmark Erga compare solo sulla Home, mai sulle altre sezioni", () => {
    renderHeader("Studio");
    expect(screen.queryByText("Erga")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PLAN_NAME })).not.toBeInTheDocument();
  });

  it("fuori dalla Home la barra resta titolo + impostazioni: niente piano, niente serie", () => {
    renderHeader("Studio");
    const settings = screen.getByRole("button", { name: SETTINGS_NAME });

    expect(screen.queryByRole("button", { name: PLAN_NAME })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /serie/i })).not.toBeInTheDocument();
    expect(settings).toBeInTheDocument();
  });

  it.each([
    "/app/impostazioni",
    "/app/impostazioni/aspetto",
    "/settings",
    "/settings/appearance",
  ])("nasconde il pulsante impostazioni nella rotta %s", (route) => {
    renderHeader("Impostazioni", route);
    expect(screen.queryByRole("button", { name: SETTINGS_NAME })).not.toBeInTheDocument();
  });

  it("il tasto piano della Home apre le Impostazioni, dove vive la carta del piano", () => {
    renderHeader(null, "/app", true);
    fireEvent.click(screen.getByRole("button", { name: PLAN_NAME }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });

  it("apre le Impostazioni dal tasto ingranaggio, senza parametri di sessione", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: SETTINGS_NAME }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/impostazioni");
    expect(screen.getByTestId("location")).not.toHaveTextContent("?");
  });
});
