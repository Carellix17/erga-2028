import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock del client Supabase: niente rete nei test unitari. (vi.hoisted:
// le variabili devono esistere quando la factory di vi.mock viene hoistata.)
const { getSessionMock, onAuthStateChangeMock, authStateCallbacks } = vi.hoisted(() => {
  const callbacks: Array<(event: string, session: unknown) => void> = [];
  return {
    authStateCallbacks: callbacks,
    getSessionMock: vi.fn(),
    onAuthStateChangeMock: vi.fn((cb: (event: string, session: unknown) => void) => {
      callbacks.push(cb);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

import AuthCallback from "@/pages/AuthCallback";

function renderCallback(initialPath = "/auth/callback?next=%2Fapp", waitTimeoutMs = 1500) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback waitTimeoutMs={waitTimeoutMs} />} />
          <Route path="/app" element={<div data-testid="app">APP CONTENUTI</div>} />
          <Route path="/login" element={<div data-testid="login">LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const fakeSession = { user: { id: "u-1", email: "student@example.com" }, access_token: "a" };

beforeEach(() => {
  authStateCallbacks.length = 0;
  getSessionMock.mockReset();
  onAuthStateChangeMock.mockClear();
});

describe("AuthCallback — attende la sessione prima di navigare", () => {
  it("sessione già presente → va alla destinazione (next)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: fakeSession } });
    renderCallback();
    await waitFor(() => expect(screen.getByTestId("app")).toBeInTheDocument());
  });

  it("sessione assente → dopo il timeout va al login conservando next", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    renderCallback("/auth/callback?next=%2Fapp", 120);
    await waitFor(() => expect(screen.getByTestId("login")).toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it("sessione che arriva dopo (evento onAuthStateChange) → va a next", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    renderCallback("/auth/callback?next=%2Fapp", 2000);
    // Il broker consegna i token con un piccolo ritardo: l'evento scatta dopo il mount.
    setTimeout(() => {
      authStateCallbacks.forEach((cb) => cb("SIGNED_IN", fakeSession));
    }, 50);
    await waitFor(() => expect(screen.getByTestId("app")).toBeInTheDocument(), {
      timeout: 2000,
    });
  });
});
