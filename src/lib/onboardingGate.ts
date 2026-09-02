/**
 * Logica pura del "cancello" di onboarding.
 *
 * PRINCIPIO: un utente NON viene mai trattato come nuovo solo perché non
 * siamo riusciti a leggere i suoi dati. Le tre situazioni sono distinte:
 *
 *  - `loading` → stiamo ancora leggendo la sessione/profilo (mai onboarding);
 *  - `error`   → la lettura del profilo è fallita (mai onboarding: l'utente
 *                 esiste ma non sappiamo se ha completato l'onboarding, quindi
 *                 blocchiamo con un errore recuperabile);
 *  - `ready`   → il server ha risposto in modo positivo: solo qui si decide
 *                 se mostrare l'onboarding (completato = false confermato).
 *
 * Questo evita la regressione "utente esistente mostrato come nuovo" quando
 * una Edge Function risponde 401/500 o viene bloccata da CORS: il problema
 * viene reso visibile invece di essere interpretato come "nessun dato".
 */

export type OnboardingInput =
  | { state: "loading" }
  | { state: "error"; error: string }
  | {
      state: "ready";
      hasCompletedOnboarding: boolean;
      hasCognitiveProfile: boolean;
    };

export type OnboardingGateState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "ready"; showOnboarding: boolean };

/**
 * Decide lo stato del cancello.
 *
 * `hasCognitiveProfile`: se il server conferma l'assenza del flag ma esiste
 * un profilo cognitivo (riga `cognitive_profiles`), il completamento è
 * comunque considerato vero: copre i profili creati prima della migration
 * che ha aggiunto `has_completed_onboarding` (default false).
 */
export function resolveOnboardingGate(
  input: OnboardingInput,
): OnboardingGateState {
  if (input.state === "loading") return { kind: "loading" };
  if (input.state === "error") return { kind: "error", error: input.error };
  const completed =
    input.hasCompletedOnboarding || input.hasCognitiveProfile;
  return { kind: "ready", showOnboarding: !completed };
}

/** Errore di lettura del profilo con un messaggio comprensibile. */
export function profileReadError(message: unknown): { state: "error"; error: string } {
  const text =
    typeof message === "string"
      ? message
      : message instanceof Error
        ? message.message
        : "Impossibile leggere il profilo. Riprova.";
  return { state: "error", error: text };
}
