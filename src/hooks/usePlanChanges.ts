import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { PlanChangeRow } from "@/lib/planner/types";

const HISTORY_DAYS = 7;

export const planChangesKeys = {
  all: (userId: string | null) => ["plan-changes", userId] as const,
};

export function usePlanChanges(enabled = true) {
  const { currentUser } = useAuth();

  return useQuery<PlanChangeRow[]>({
    queryKey: planChangesKeys.all(currentUser),
    enabled: enabled && !!currentUser,
    staleTime: 15_000,
    queryFn: async () => {
      if (!currentUser) return [];
      const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("plan_changes")
        .select("id, user_id, changes, created_at, applied_at, reason, status, undone_at")
        .eq("user_id", currentUser)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanChangeRow[];
    },
  });
}
