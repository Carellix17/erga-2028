import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { profileReadError, type OnboardingInput } from "@/lib/onboardingGate";

export interface CognitiveProfile {
  nome: string | null;
  eta: number | null;
  istituto: string | null;
  log_score: number;
  mem_score: number;
  foc_score: number;
  voc_score: number;
  ans_score: number;
  app_score: number;
}

export type CognitiveLoadStatus = "loading" | "ready" | "error";

export interface UseCognitiveProfileResult {
  profile: CognitiveProfile | null;
  /** TRUE solo quando il server ha confermato il completamento. */
  hasCompletedOnboarding: boolean;
  /** TRUE solo quando il server HA risposto (ok o errore): mai prima. */
  isLoaded: boolean;
  /** Stato della lettura: "error" ≠ "profilo assente". */
  status: CognitiveLoadStatus;
  error: string | null;
  /** Input tipizzato per il cancello onboarding (vedi onboardingGate). */
  gateInput: OnboardingInput;
  refresh: () => Promise<void>;
  save: (data: Partial<CognitiveProfile>) => Promise<boolean>;
}

interface CognitiveGetResponse {
  cognitive?: CognitiveProfile | null;
  hasCompletedOnboarding?: boolean;
}

/**
 * Recupera il profilo cognitivo (e il flag di onboarding) da
 * `cognitive-profile` Edge Function, usando SEMPRE l'utente Supabase
 * (auth.uid()), mai email o localStorage.
 *
 * Regressione corretta: prima qualunque errore di rete/CORS/401/500 veniva
 * inghiottito e interpretato come "utente senza dati" → l'utente esistente
 * ripartiva dall'onboarding. Ora lo stato `error` è esposto e il cancello
 * non può mostrare l'onboarding senza una conferma positiva del server.
 */
export function useCognitiveProfile(): UseCognitiveProfileResult {
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [status, setStatus] = useState<CognitiveLoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [gateInput, setGateInput] = useState<OnboardingInput>({ state: "loading" });
  // Contatore anti-risposta-stantia: se l'utente cambia (logout/login rapido),
  // ignoriamo le risposte arrivate dopo il cambio.
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setIsLoaded(true);
      setStatus("ready");
      setError(null);
      setGateInput({
        state: "ready",
        hasCompletedOnboarding: false,
        hasCognitiveProfile: false,
      });
      return;
    }

    const seq = ++requestSeq.current;
    setIsLoaded(false);
    setStatus("loading");
    setError(null);

    try {
      const data = await edgeFetch<CognitiveGetResponse>("cognitive-profile", {
        action: "get",
        userId: currentUser,
      });
      if (seq !== requestSeq.current) return;
      const completed =
        data?.hasCompletedOnboarding === true || !!data?.cognitive;
      setProfile(data?.cognitive ?? null);
      setHasCompletedOnboarding(completed);
      setGateInput({
        state: "ready",
        hasCompletedOnboarding: completed,
        hasCognitiveProfile: !!data?.cognitive,
      });
      setStatus("ready");
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error("cognitive get error", e);
      // ⚠️ NON resettare il flag: un errore non è "utente nuovo".
      setError(
        e instanceof Error ? e.message : "Impossibile leggere il profilo.",
      );
      setGateInput(profileReadError(e));
      setStatus("error");
    } finally {
      if (seq === requestSeq.current) setIsLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (data: Partial<CognitiveProfile>) => {
      if (!currentUser) return false;
      try {
        await edgeFetch("cognitive-profile", {
          action: "save",
          userId: currentUser,
          ...data,
        });
        await refresh();
        return true;
      } catch (e) {
        console.error("cognitive save error", e);
        return false;
      }
    },
    [currentUser, refresh],
  );

  return {
    profile,
    hasCompletedOnboarding,
    isLoaded,
    status,
    error,
    gateInput,
    refresh,
    save,
  };
}
