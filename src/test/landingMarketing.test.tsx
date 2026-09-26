import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ErgaMarketing } from "@/components/landing/ErgaMarketing";

function renderLanding() {
  return render(
    <MemoryRouter>
      <ErgaMarketing />
    </MemoryRouter>,
  );
}

describe("landing marketing", () => {
  it("descrive in modo trasparente la beta e il piano Pro", () => {
    renderLanding();

    // Titolo hero aggiornato dalla sessione landing (un solo h1)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ogni mente ha la sua geometria/i,
    );
    expect(screen.getByText(/beta gratuita · nessuna carta richiesta · pro in arrivo/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("6,99 €");
    expect(document.body).not.toHaveTextContent("iris.p@example.org");
  });

  it("porta le call to action alla registrazione senza parametri ignorati", () => {
    renderLanding();

    const signupLinks = screen.getAllByRole("link").filter((link) =>
      /inizia gratis|profilo gratuito|partecipa alla beta/i.test(link.textContent ?? ""),
    );

    expect(signupLinks.length).toBeGreaterThan(0);
    signupLinks.forEach((link) => expect(link).toHaveAttribute("href", "/registrati"));
  });

  it("collega ogni domanda FAQ alla relativa risposta", () => {
    renderLanding();

    const question = screen.getByRole("button", { name: "Quanto costa?" });
    expect(question).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
    const answerId = question.getAttribute("aria-controls");
    expect(answerId).toBeTruthy();
    expect(document.getElementById(answerId!)).toHaveTextContent(/beta.*gratuito/i);
  });

  it("gestisce il focus del menu mobile e lo chiude con Escape", () => {
    renderLanding();

    const menuButton = screen.getByRole("button", { name: "Apri menu" });
    fireEvent.click(menuButton);

    const mobileNav = screen.getByRole("navigation", { name: "Menu mobile" });
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(within(mobileNav).getByRole("link", { name: "Come funziona" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });

  it("mostra la vera struttura della Home e aggiorna la materia scelta", () => {
    renderLanding();

    expect(screen.getAllByText("Buongiorno").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Preparazione lezione").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Piano del giorno").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Latino" }));

    expect(screen.getAllByText("Sintassi dei casi").length).toBeGreaterThan(0);
    expect(screen.getByText("Schema dei casi")).toBeInTheDocument();
    expect(screen.getByText("Versione guidata")).toBeInTheDocument();
  });

  it("racconta la trasformazione dal materiale al piano", () => {
    renderLanding();

    expect(screen.getByRole("heading", { name: "Parti da ciò che studi davvero." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Percorso" }));
    expect(screen.getByRole("heading", { name: "La mappa diventa un percorso." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Piano" }));
    expect(screen.getByRole("heading", { name: "Il percorso entra nella tua settimana." })).toBeInTheDocument();
  });

  it("mostra una sola anteprima e permette di cambiare vista", () => {
    renderLanding();

    const controls = screen.getByRole("tablist", { name: "Dal materiale al piano" });
    fireEvent.click(within(controls).getByRole("tab", { name: "Piano" }));

    expect(screen.getByRole("heading", { name: "Il percorso entra nella tua settimana." })).toBeInTheDocument();
    expect(within(controls).getByRole("tab", { name: "Piano" })).toHaveAttribute("aria-selected", "true");
  });

  it("non sovrappone la navigazione alla lezione a schermo intero", () => {
    const { container } = renderLanding();
    const controls = screen.getByRole("tablist", { name: "Dal materiale al piano" });

    fireEvent.click(within(controls).getByRole("tab", { name: "Percorso" }));

    expect(container.querySelector(".lp-showcase-phone nav")).not.toBeInTheDocument();
    expect(screen.getByText("Le basi della cinematica")).toBeInTheDocument();
  });
});
