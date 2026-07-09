import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EvaluationType = "orale" | "scritta" | "pratica" | "interrogazione" | "compito";

export interface Evaluation {
  id: string;
  user_id: string;
  subject_id: string | null;
  type: EvaluationType;
  title: string;
  description: string | null;
  date: string;
  topic_type: "linked" | "free";
  topic_id: string | null;
  free_topic_title: string | null;
  created_at: string;
}

export interface EvaluationInput {
  subject_id: string | null;
  type: EvaluationType;
  title: string;
  description?: string | null;
  date: string;
  topic_type: "linked" | "free";
  topic_id?: string | null;
  free_topic_title?: string | null;
}

async function getUid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export function useEvaluations(enabled = true) {
  return useQuery({
    queryKey: ["evaluations"],
    enabled,
    queryFn: async () => {
      const uid = await getUid();
      if (!uid) return [] as Evaluation[];
      const { data, error } = await (supabase as any)
        .from("evaluations")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Evaluation[];
    },
  });
}

export function useAddEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EvaluationInput) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("evaluations")
        .insert({ ...input, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

export function useUserMiniLessons() {
  return useQuery({
    queryKey: ["user_mini_lessons"],
    queryFn: async () => {
      const uid = await getUid();
      if (!uid) return [] as { id: string; title: string; context_id: string | null }[];
      const { data, error } = await (supabase as any)
        .from("mini_lessons")
        .select("id, title, context_id")
        .eq("user_id", uid)
        .order("lesson_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; context_id: string | null }[];
    },
  });
}