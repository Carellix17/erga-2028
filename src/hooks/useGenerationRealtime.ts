import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lessonsKeys } from "./useLessons";

/**
 * Sottoscrive in Realtime ai cambi di `study_contexts` e `exercise_jobs`
 * dell'utente corrente. Quando il backend aggiorna lo stato di una
 * generazione in background, invalidiamo la cache così la UI riprende
 * il filo da sola (anche dopo che l'utente ha chiuso e riaperto l'app).
 */
export function useGenerationRealtime() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`generation-status-${currentUser}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "study_contexts",
          filter: `user_id=eq.${currentUser}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: lessonsKeys.contexts(currentUser) });
          qc.invalidateQueries({ queryKey: lessonsKeys.all(currentUser) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exercise_jobs",
          filter: `user_id=eq.${currentUser}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["exercise_jobs", currentUser] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, qc]);
}