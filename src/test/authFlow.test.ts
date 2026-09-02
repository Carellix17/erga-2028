import { describe, expect, it, vi } from "vitest";
import {
  completeOAuthSignIn,
  normalizeEmail,
  oauthCallbackUrl,
  safeNextPath,
} from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("normalizeEmail", () => {
  it("normalizza in lowercase e senza spazi", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail("USER@example.com")).toBe("user@example.com");
  });

  it("restituisce null per valori vuoti", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("mantiene i path interni sicuri", () => {
    expect(safeNextPath("/app")).toBe("/app");
    expect(safeNextPath("/app/impostazioni?tab=1")).toBe("/app/impostazioni?tab=1");
  });

  it("blocca URL esterni, double-slash e traversal", () => {
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath("")).toBe("/app");
    expect(safeNextPath("https://evil.example")).toBe("/app");
    expect(safeNextPath("//evil.example")).toBe("/app");
    expect(safeNextPath("/app/../evil")).toBe("/app");
  });
});

describe("oauthCallbackUrl", () => {
  it("usa la rotta di callback con next codificato", () => {
    expect(oauthCallbackUrl("/app", "https://erga-learning.app")).toBe(
      "https://erga-learning.app/auth/callback?next=%2Fapp",
    );
    expect(oauthCallbackUrl("//evil", "https://erga-learning.app")).toBe(
      "https://erga-learning.app/auth/callback?next=%2Fapp",
    );
  });
});

describe("completeOAuthSignIn", () => {
  function fakeClient() {
    const setSession = vi.fn().mockResolvedValue({ data: { session: {} } });
    return {
      auth: { setSession },
    } as unknown as SupabaseClient & { auth: { setSession: ReturnType<typeof vi.fn> } };
  }

  it("applica i token alla sessione Supabase (flusso popup/preview)", async () => {
    const client = fakeClient();
    await completeOAuthSignIn(
      {
        tokens: { access_token: "a", refresh_token: "r" },
        error: null,
        redirected: false,
      },
      client,
    );
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: "a",
      refresh_token: "r",
    });
  });

  it("non tocca la sessione quando il browser è stato girato dal broker", async () => {
    const client = fakeClient();
    await completeOAuthSignIn({ redirected: true, error: null }, client);
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it("propaga gli errori del broker senza applicare token", async () => {
    const client = fakeClient();
    const err = new Error("access_denied");
    await expect(
      completeOAuthSignIn({ error: err, redirected: false }, client),
    ).rejects.toThrow("access_denied");
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it("fallisce chiaramente se i token mancano", async () => {
    const client = fakeClient();
    await expect(
      completeOAuthSignIn({ error: null, redirected: false }, client),
    ).rejects.toThrow(/Nessun token/);
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });
});
