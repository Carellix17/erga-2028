import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AI_FIRST_OPEN, AiActFirstOpen } from "@/components/legal/AiActNotice";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal";
import Privacy from "@/pages/legal/Privacy";

describe("avviso sull'IA in chat", () => {
  beforeEach(() => localStorage.clear());

  it("si chiude una volta sola", () => {
    const { unmount } = render(<AiActFirstOpen />);
    expect(screen.getByText(AI_FIRST_OPEN)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(screen.queryByText(AI_FIRST_OPEN)).not.toBeInTheDocument();
    unmount();
    render(<AiActFirstOpen />);
    expect(screen.queryByText(AI_FIRST_OPEN)).not.toBeInTheDocument();
    expect(localStorage.getItem("erga.aiAct.chatNoticeDismissed")).toBe("1");
  });
});

describe("informativa", () => {
  it("descrive l'IA, i contatori dei costi e il contatto per la privacy", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Privacy />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole("heading", { name: /Intelligenza artificiale/ })).toBeInTheDocument();
    expect(screen.getByText(/Mistral AI SAS, Parigi, Francia/)).toBeInTheDocument();
    expect(screen.getByText(/Google \(Gemini\), OpenAI, Groq, OpenRouter, il gateway Lovable e Microsoft Azure per la sintesi vocale/)).toBeInTheDocument();
    expect(screen.queryByText(/data di nascita|almeno 14 anni/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Erga usa l'IA di Mistral, con server in Europa/)).toBeInTheDocument();
    expect(screen.getByText(/In questi contatori non registriamo chi sei/)).toBeInTheDocument();
    expect(screen.getByText(/al massimo 90 giorni, come spiegato sopra/)).toBeInTheDocument();
    expect(screen.getAllByText(PRIVACY_CONTACT_EMAIL)[0]).toBeInTheDocument();
    expect(screen.getByText(/Il titolare del trattamento è Erga/)).toBeInTheDocument();
  });
});
