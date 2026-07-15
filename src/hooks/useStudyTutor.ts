import { useState, useCallback } from "react";
import { edgeFetch } from "@/lib/edgeFetch";

// ── Tipi ──────────────────────────────────────────────────────────────────────

export interface ConcettoChiave {
  nome: string;
  definizione_breve: string;
  perche_importante: string;
}

export interface Flashcard {
  id: string;
  fronte: string;
  retro: string;
  difficolta: "facile" | "medio" | "difficile";
}

export interface DomandaAutovalutazione {
  id: string;
  domanda: string;
  tipo: "aperta" | "scelta_multipla";
  opzioni: string[];
  risposta_corretta: string;
  spiegazione_risposta: string;
}

export interface StudyMaterial {
  titolo_argomento: string;
  warning: string | null;
  sintesi_concettuale: {
    spiegazione_feynman: string;
    concetti_chiave: ConcettoChiave[];
  };
  flashcards: Flashcard[];
  domande_autovalutazione: DomandaAutovalutazione[];
  collegamenti_suggeriti: string[];
}

type State = "idle" | "loading" | "success" | "error";

interface UseStudyTutorReturn {
  material: StudyMaterial | null;
  state: State;
  error: string | null;
  generate: (inputText: string, contextId?: string) => Promise<void>;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudyTutor(): UseStudyTutorReturn {
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setMaterial(null);
    setState("idle");
    setError(null);
  }, []);

  const generate = useCallback(async (inputText: string, contextId?: string) => {
    if (inputText.trim().length < 20 && !contextId) {
      setState("error");
      setError("Il testo è troppo corto. Inserisci almeno 20 caratteri di appunti.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const result = await edgeFetch<{ material: StudyMaterial }>("study-tutor", {
        inputText: inputText.trim(),
        ...(contextId ? { contextId } : {}),
      });

      if (!result?.material?.sintesi_concettuale) {
        throw new Error("Risposta non valida dal server.");
      }

      setMaterial(result.material);
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Errore sconosciuto. Riprova.");
    }
  }, []);

  return { material, state, error, generate, reset };
}
