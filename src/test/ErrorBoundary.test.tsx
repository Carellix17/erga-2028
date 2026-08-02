import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Componente "bomba": esplode finche' la levetta e' armata
let armed = false;
function Bomb() {
  if (armed) throw new Error("boom di test");
  return <p>tutto tranquillo</p>;
}

describe("ErrorBoundary (paracadute anti-schermo-bianco)", () => {
  beforeEach(() => {
    armed = false;
    // React logga l'errore in console di proposito: lo silenziamo nei test
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lascia passare i figli quando non ci sono errori", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("tutto tranquillo")).toBeInTheDocument();
  });

  it("se un figlio esplode, mostra la pagina di cortesia invece dello schermo bianco", () => {
    armed = true;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/qualcosa è andato storto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ricarica/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /riprova/i })).toBeInTheDocument();
  });

  it("il tasto Riprova riporta ai contenuti (se l'errore era passeggero)", () => {
    armed = true;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    // l'errore era "passeggero": disinnesco la bomba e premo Riprova
    armed = false;
    fireEvent.click(screen.getByRole("button", { name: /riprova/i }));
    expect(screen.getByText("tutto tranquillo")).toBeInTheDocument();
    expect(screen.queryByText(/qualcosa è andato storto/i)).not.toBeInTheDocument();
  });
});
