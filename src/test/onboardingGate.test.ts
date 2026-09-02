import { describe, expect, it } from "vitest";
import {
  profileReadError,
  resolveOnboardingGate,
} from "@/lib/onboardingGate";

describe("resolveOnboardingGate — l'utente esistente non è mai trattato come nuovo per errore", () => {
  it("mentre il profilo non è ancora letto → loading, MAI onboarding", () => {
    const state = resolveOnboardingGate({ state: "loading" });
    expect(state.kind).toBe("loading");
  });

  it("errore di lettura → stato error, MAI onboarding", () => {
    const state = resolveOnboardingGate({
      state: "error",
      error: "Sessione scaduta",
    });
    expect(state.kind).toBe("error");
    if (state.kind === "error") expect(state.error).toContain("Sessione");
  });

  it("profilo confermato completato → nessun onboarding", () => {
    const state = resolveOnboardingGate({
      state: "ready",
      hasCompletedOnboarding: true,
      hasCognitiveProfile: true,
    });
    expect(state.kind).toBe("ready");
    if (state.kind === "ready") expect(state.showOnboarding).toBe(false);
  });

  it("utente nuovo confermato (flag false e nessun profilo) → onboarding consentito", () => {
    const state = resolveOnboardingGate({
      state: "ready",
      hasCompletedOnboarding: false,
      hasCognitiveProfile: false,
    });
    expect(state.kind).toBe("ready");
    if (state.kind === "ready") expect(state.showOnboarding).toBe(true);
  });

  it("flag false ma profilo cognitivo esistente (legacy) → NON onboarding", () => {
    // Copre i profili creati prima della colonna has_completed_onboarding:
    // il flag era default false, ma l'utente aveva già completato il test.
    const state = resolveOnboardingGate({
      state: "ready",
      hasCompletedOnboarding: false,
      hasCognitiveProfile: true,
    });
    expect(state.kind).toBe("ready");
    if (state.kind === "ready") expect(state.showOnboarding).toBe(false);
  });
});

describe("profileReadError", () => {
  it("estrae un messaggio leggibile", () => {
    expect(profileReadError(new Error("boom")).error).toBe("boom");
    expect(profileReadError("testo").error).toBe("testo");
    expect(profileReadError(undefined).error).toContain("profilo");
  });
});
