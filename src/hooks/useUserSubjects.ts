import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserSubject {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
}

async function getUid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export function useUserSubjects() {
  return useQuery({
    queryKey: ["user_subjects"],
    queryFn: async () => {
      const uid = await getUid();
      if (!uid) return [] as UserSubject[];
      const { data, error } = await (supabase as any)
        .from("user_subjects")
        .select("*")
        .eq("user_id", uid)
        .order("name");
      if (error) throw error;
      return (data ?? []) as UserSubject[];
    },
  });
}

export function useAddUserSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("user_subjects")
        .insert({ user_id: uid, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_subjects"] }),
  });
}

export function useDeleteUserSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("user_subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_subjects"] }),
  });
}
