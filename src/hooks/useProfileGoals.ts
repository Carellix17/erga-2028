import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Livelli attuali e obiettivi di voto dello studente,
 * letti/salvati tramite la edge function user-profile (che valida i valori).
 */

export interface ProfileGoals {
  subjectLevels: Record<string, number>;
  subjectGoals: Record<string, number>;
}

async function callUserProfile(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body),
    },
  );
  return response.json();
}

const goalsKeys = {
  all: (userId: string | null) => ["profile-goals", userId] as const,
};

export function useProfileGoalsQuery(currentUser: string | null) {
  return useQuery<ProfileGoals>({
    queryKey: goalsKeys.all(currentUser),
    enabled: !!currentUser,
    queryFn: async () => {
      const data = await callUserProfile({ userId: currentUser, action: "get" });
      const p = data.profile ?? {};
      return {
        subjectLevels: (p.subject_levels as Record<string, number>) ?? {},
        subjectGoals: (p.subject_goals as Record<string, number>) ?? {},
      };
    },
  });
}

/** Salva l'intero oggetto subject_goals (la function unisce solo i campi inviati). */
export function useSaveSubjectGoals(currentUser: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subjectGoals: Record<string, number>) => {
      const data = await callUserProfile({
        userId: currentUser,
        action: "save",
        subject_goals: subjectGoals,
      });
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: goalsKeys.all(currentUser) }),
  });
}
