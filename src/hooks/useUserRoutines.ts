import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RoutineKind = "school" | "sleep" | "meal" | "other";

export interface UserRoutine {
  id: string;
  user_id: string;
  kind: RoutineKind;
  label: string | null;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  days_of_week: number[];
}

async function getUid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export function useUserRoutines() {
  return useQuery({
    queryKey: ["user_routines"],
    queryFn: async () => {
      const uid = await getUid();
      if (!uid) return [] as UserRoutine[];
      const { data, error } = await (supabase as any)
        .from("user_routines")
        .select("*")
        .eq("user_id", uid)
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as UserRoutine[];
    },
  });
}

export function useAddUserRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<UserRoutine, "id" | "user_id">) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("user_routines")
        .insert({ ...payload, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_routines"] }),
  });
}

export function useUpdateUserRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string } & Partial<Omit<UserRoutine, "id" | "user_id">>) => {
      const { id, ...rest } = payload;
      const { error } = await (supabase as any)
        .from("user_routines")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_routines"] }),
  });
}

export function useDeleteUserRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("user_routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_routines"] }),
  });
}
