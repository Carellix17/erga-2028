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

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /il tuo materiale.*un percorso.*da seguire/i,
    );
    expect(screen.getByText("Gratis, senza carta.")).toBeInTheDocument();
    expect(screen.getByText("Non è ancora in vendita.")).toBeInTheDocument();
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
    expect(within(mobileNav).getByRole("link", { name: "Prodotto" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });

  it("mostra subito il risultato completo quando si cambia materia", () => {
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: "Latino · Sintassi dei casi" }));

    expect(screen.getByText("Schema dei casi")).toBeInTheDocument();
    expect(screen.getByText("Versione guidata")).toBeInTheDocument();
    expect(screen.getByText("Richiamo per l’interrogazione")).toBeInTheDocument();
    expect(screen.getByText(/Esempio di percorso · Tempo stimato: 18 min/)).toBeInTheDocument();
  });

  it("racconta la trasformazione dal materiale al piano", () => {
    renderLanding();

    expect(screen.getByRole("heading", { name: "Parti da ciò che studi davvero." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Erga trova il filo." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "La mappa diventa un percorso." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Il percorso entra nella tua settimana." })).toBeInTheDocument();
  });

  it("mostra una sola anteprima e permette di cambiare vista", () => {
    renderLanding();

    const controls = screen.getByRole("group", { name: "Scegli l’anteprima dell’app" });
    fireEvent.click(within(controls).getByRole("button", { name: "Piano" }));

    expect(screen.getByRole("heading", { name: "Una proposta che puoi accettare o cambiare." })).toBeInTheDocument();
    expect(screen.getByText("Vista mese e settimana")).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Piano" })).toHaveAttribute("aria-pressed", "true");
  });
});
