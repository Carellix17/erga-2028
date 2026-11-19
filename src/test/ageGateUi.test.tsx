import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgeGate } from "@/components/auth/AgeGate";
import { edgeFetch } from "@/lib/edgeFetch";
import { calendarDateInRome } from "../../supabase/functions/_shared/ageCheck";
import { AI_FIRST_OPEN, AiActFirstOpen } from "@/components/legal/AiActNotice";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Privacy from "@/pages/legal/Privacy";

vi.mock("@/lib/edgeFetch", () => ({ edgeFetch: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const fetchMock = vi.mocked(edgeFetch);

function sixteenYearsAgo(): string {
  const [year] = calendarDateInRome(new Date()).split("-").map(Number);
  return `${year - 16}-06-15`;
}

describe("schermata dell'età", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
  });

  it("mostra la casella solo tra 14 e 17 anni, non preselezionata", async () => {
    fetchMock.mockResolvedValue({ state: "required" });
    render(
      <AgeGate>
        <p>app aperta</p>
      </AgeGate>,
    );

    expect(screen.queryByText("app aperta")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Prima di entrare" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Data di nascita"), {
      target: { value: sixteenYearsAgo() },
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Continua" })).toBeDisabled();
    expect(screen.getByText("Ho almeno 14 anni e i miei genitori sono d'accordo che io usi Erga.")).toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(screen.getByRole("button", { name: "Continua" })).toBeEnabled();
  });

  it("sotto i 14 anni mostra il blocco e non apre l'app", async () => {
    fetchMock.mockResolvedValueOnce({ state: "required" });
    render(
      <AgeGate>
        <p>app aperta</p>
      </AgeGate>,
    );
    await screen.findByRole("heading", { name: "Prima di entrare" });
    fetchMock.mockResolvedValueOnce({ state: "blocked" });

    fireEvent.change(screen.getByLabelText("Data di nascita"), {
      target: { value: "2014-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continua" }));

    expect(await screen.findByRole("heading", { name: "Erga è per chi ha almeno 14 anni" })).toBeInTheDocument();
    expect(screen.getByText("Non abbiamo salvato nessun tuo dato.")).toBeInTheDocument();
    expect(screen.queryByText(/Abbiamo cancellato l'account/)).not.toBeInTheDocument();
    expect(screen.queryByText("app aperta")).not.toBeInTheDocument();
    const stored = localStorage.getItem("erga.ageGate.blockedUntil");
    expect(stored).toMatch(/^\d+$/);
  });
});

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
  it("sostituisce le sezioni sull'IA e sui minorenni e lascia i contatori", () => {
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
    expect(screen.getByRole("heading", { name: /Età minima e studenti minorenni/ })).toBeInTheDocument();
    expect(screen.getByText(/Erga usa l'IA di Mistral, con server in Europa/)).toBeInTheDocument();
    expect(screen.getByText(/In questi contatori non registriamo chi sei/)).toBeInTheDocument();
    expect(screen.getByText(/al massimo 90 giorni, come spiegato sopra/)).toBeInTheDocument();
    expect(screen.getByText("TODO-email-privacy")).toBeInTheDocument();
    expect(screen.getByText(/Il titolare del trattamento è Erga/)).toBeInTheDocument();
  });
});
