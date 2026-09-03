import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";

// 🔐 P41 — la nuova schermata di accesso: due colonne, validazione client,
// anti-doppio-invio e pannello "Password dimenticata?". La logica Supabase è
// mockata AL CONFINE del modulo: il componente deve usare solo le API reali.

const signInWithPassword = vi.fn();
const resetPasswordForEmail = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
  },
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) } },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function mountLogin() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("P41 — Login a due colonne", () => {
  beforeEach(() => {
    signInWithPassword.mockReset().mockResolvedValue({ error: null });
    resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  });

  it("layout desktop: griglia 2 colonne, colonna hero nascosta sotto md", () => {
    const { container } = mountLogin();
    const grid = container.querySelector(".md\\:grid-cols-2");
    expect(grid).toBeTruthy();
    const hero = container.querySelector(".md\\:flex");
    expect(hero).toBeTruthy();
    expect(hero?.className).toMatch(/hidden/); // invisibile su mobile
    // hero coerente con lo studio (brand claim), niente testimonianze generiche
    expect(screen.getByText("Ogni mente ha la sua geometria.")).toBeTruthy();
  });

  it("campi vuoti: errore inline e NESSUNA chiamata a Supabase", () => {
    mountLogin();
    fireEvent.click(screen.getByRole("button", { name: /Accedi/i }));
    expect(screen.getByText("Inserisci email e password per continuare")).toBeTruthy();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("email malformata: validazione prima della chiamata", () => {
    mountLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "non-una-email" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "segretissima" } });
    fireEvent.click(screen.getByRole("button", { name: /Accedi/i }));
    expect(screen.getByText("Il formato dell'email non è valido")).toBeTruthy();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("credenziali valide: signInWithPassword con email trimmata", async () => {
    mountLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "  user@example.com  " } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "segretissima" } });
    fireEvent.click(screen.getByRole("button", { name: /Accedi/i }));
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "segretissima",
      }),
    );
  });

  it("click multipli durante il caricamento: una sola chiamata API", async () => {
    let resolveFn: (v: { error: unknown }) => void = () => {};
    signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    mountLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "segretissima" } });

    const submit = screen.getByRole("button", { name: /Accedi/i });
    fireEvent.click(submit);
    fireEvent.click(submit); // secondo tap mentre il primo è in volo
    fireEvent.click(submit); // terzo tap
    expect(signInWithPassword).toHaveBeenCalledTimes(1);

    resolveFn({ error: null });
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
  });

  it("credenziali errate: messaggio leggibile e form di nuovo utilizzabile", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    mountLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "sbagliata" } });
    fireEvent.click(screen.getByRole("button", { name: /Accedi/i }));

    await waitFor(() =>
      expect(screen.getByText("Email o password non corretti")).toBeTruthy(),
    );
    const submit = screen.getByRole("button", { name: /Accedi/i }) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false)); // form riutilizzabile
  });

  it("Google OAuth: il pulsante avvia il flusso del broker", async () => {
    const { lovable } = await import("@/integrations/lovable");
    mountLogin();
    fireEvent.click(screen.getByRole("button", { name: "Continua con Google" }));
    await waitFor(() =>
      expect(lovable.auth.signInWithOAuth).toHaveBeenCalledWith(
        "google",
        expect.objectContaining({ redirect_uri: expect.stringContaining("/auth/callback") }),
      ),
    );
  });

  it("password dimenticata: invia l'email di reset verso /cambia-password", async () => {
    mountLogin();
    fireEvent.click(screen.getByRole("button", { name: /password dimenticata/i }));

    const input = await screen.findByLabelText(/email/i);
    fireEvent.change(input, { target: { value: "  user@example.com  " } });
    fireEvent.click(screen.getByRole("button", { name: /invia il link di reset/i }));

    await waitFor(() =>
      expect(resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/cambia-password") }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText(/Email inviata/)).toBeTruthy(),
    );
  });

  it("dal pannello reset si torna al login senza ricaricare", () => {
    mountLogin();
    fireEvent.click(screen.getByRole("button", { name: /password dimenticata/i }));
    fireEvent.click(screen.getByRole("button", { name: /torna all'accesso/i }));
    expect(screen.getByRole("button", { name: "Continua con Google" })).toBeTruthy();
  });
});
