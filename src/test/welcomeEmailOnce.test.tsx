import { act, render, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => {
  const callbacks: Array<(event: string, session: unknown) => void> = [];
  return {
    callbacks,
    getSession: vi.fn(),
    invoke: vi.fn(),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      callbacks.push(callback);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    functions: { invoke: authMocks.invoke },
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";

function makeSession(
  createdAt: string,
  userId = "new-user-123",
  email: string | null = "student@example.com",
): Session {
  return {
    access_token: "test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    user: {
      id: userId,
      email,
      created_at: createdAt,
      user_metadata: { name: "Arianna" },
    },
  } as unknown as Session;
}

async function mountAuthProvider() {
  const expectedCallbackCount = authMocks.callbacks.length + 1;
  const view = render(<AuthProvider><div>contenuto</div></AuthProvider>);
  await waitFor(() => expect(authMocks.callbacks.length).toBe(expectedCallbackCount));
  return view;
}

function emitAuthEvent(index: number, session: Session, event = "SIGNED_IN") {
  const callback = authMocks.callbacks[index];
  if (!callback) throw new Error(`Callback auth ${index} non registrato`);
  act(() => callback(event, session));
}

beforeEach(() => {
  authMocks.callbacks.length = 0;
  authMocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  authMocks.invoke.mockReset().mockResolvedValue({ data: { success: true }, error: null });
  authMocks.onAuthStateChange.mockClear();
  localStorage.clear();
});

describe("welcome email al primo accesso di un account nuovo", () => {
  it("non invia per un account creato più di dieci minuti fa", async () => {
    await mountAuthProvider();
    const createdTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    emitAuthEvent(0, makeSession(createdTwoDaysAgo));

    expect(authMocks.invoke).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("richiede SIGNED_IN e un indirizzo presente anche per un account recente", async () => {
    await mountAuthProvider();
    const createdOneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    emitAuthEvent(0, makeSession(createdOneMinuteAgo), "TOKEN_REFRESHED");
    emitAuthEvent(0, makeSession(createdOneMinuteAgo, "missing-email-user", null));

    expect(authMocks.invoke).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("invoca una volta per un account recente e ricorda solo il suo id anche dopo nuovi eventi e mount", async () => {
    const session = makeSession(new Date(Date.now() - 60 * 1000).toISOString());
    const storageKey = `erga:welcome:${session.user.id}`;

    const firstMount = await mountAuthProvider();
    emitAuthEvent(0, session);

    await waitFor(() => expect(authMocks.invoke).toHaveBeenCalledTimes(1));
    expect(authMocks.invoke).toHaveBeenCalledWith("send-welcome-email", { body: { name: "Arianna" } });
    expect(localStorage.getItem(storageKey)).toBe("sent");
    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe(storageKey);
    expect(localStorage.getItem(storageKey)).not.toContain("student@example.com");
    expect(localStorage.getItem(storageKey)).not.toContain("Arianna");

    emitAuthEvent(0, session);
    expect(authMocks.invoke).toHaveBeenCalledTimes(1);

    firstMount.unmount();
    await mountAuthProvider();
    emitAuthEvent(1, session);

    expect(authMocks.invoke).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe(storageKey);
  });
});
