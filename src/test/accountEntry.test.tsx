import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { COGNITIVE_QUESTIONS, INSTITUTES_LIST } from "@/lib/cognitiveQuestions";

const { auth, save } = vi.hoisted(() => ({
  auth: { isAuthenticated: true, isLoading: false },
  save: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useSplashGate", () => ({ useSplashGate: () => ({ showSplash: false }) }));
vi.mock("@/hooks/useCognitiveProfile", () => ({ useCognitiveProfile: () => ({ save }) }));

function LoginLocation() {
  return <p>{useLocation().search}</p>;
}

function renderProtectedRoute(isAuthenticated: boolean) {
  auth.isAuthenticated = isAuthenticated;
  render(
    <MemoryRouter initialEntries={["/app/profilo?tab=studio"]}>
      <Routes>
        <Route path="/app/profilo" element={<ProtectedRoute><h1>Il tuo profilo</h1></ProtectedRoute>} />
        <Route path="/login" element={<LoginLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("accesso e profilo di studio", () => {
  it("apre la pagina protetta con la sola sessione", () => {
    renderProtectedRoute(true);
    expect(screen.getByRole("heading", { name: "Il tuo profilo" })).toBeInTheDocument();
  });

  it("manda al login chi non ha una sessione e conserva la destinazione", () => {
    renderProtectedRoute(false);
    expect(screen.queryByRole("heading", { name: "Il tuo profilo" })).not.toBeInTheDocument();
    expect(screen.getByText("?next=%2Fapp%2Fprofilo%3Ftab%3Dstudio")).toBeInTheDocument();
  });

  it("salva il questionario completo senza chiedere l'età", async () => {
    render(<CognitiveOnboarding />);
    fireEvent.click(screen.getByRole("button", { name: "Inizia" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Ari" } });
    fireEvent.click(screen.getByRole("button", { name: "Avanti" }));
    fireEvent.click(screen.getByRole("button", { name: INSTITUTES_LIST[0] }));
    fireEvent.click(screen.getByRole("button", { name: "Avanti" }));

    COGNITIVE_QUESTIONS.forEach((question, index) => {
      expect(screen.getByRole("heading", { name: question.question })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: question.options[0].label }));
      const label = index === COGNITIVE_QUESTIONS.length - 1 ? "Calcola Esagono" : "Avanti";
      fireEvent.click(screen.getByRole("button", { name: label }));
    });

    expect(await screen.findByRole("heading", { name: /Esagono creato/ })).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ nome: "Ari", istituto: INSTITUTES_LIST[0] }));
    expect(save.mock.calls[0][0]).not.toHaveProperty("eta");
  });
});
