import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

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
  /** Voto che lo studente vuole ottenere (opzionale, guida la priorita' del piano AI). */
  goal: number | null;
  /**
   * 📔 P49 — la spunta del diario: true quando il compito è stato fatto.
   * Colonna aggiunta con la migrazione P49 (vedi prompt per Lovable).
   * Prima della migrazione il valore arriva `undefined`: va letto come false.
   */
  is_completed: boolean;
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
  goal?: number | null;
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
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Evaluation[];
    },
  });
}

export function useAddEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EvaluationInput) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
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
      const { error } = await supabase.from("evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

export function useUpdateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EvaluationInput & { id: string }) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { id, ...fields } = input;
      const { error } = await supabase
        .from("evaluations")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", uid); // sicurezza: mai righe di altri utenti
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

/**
 * 📔 P49 — LA SPUNTA DEL DIARIO, con aggiornamento ottimistico.
 *
 * Il tocco dello studente deve avere effetto SUBITO (la spunta non aspetta il
 * cloud): aggiorniamo la cache, poi salviamo. Se il salvataggio fallisce,
 * riportiamo la lista a com'era e lasciamo parlare l'errore: mai far credere
 * che sia stato salvato quando non lo è.
 */
export function useToggleEvaluationCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      // 📔 P49 — la colonna `is_completed` esiste ora nello schema: i tipi
      // generati la conoscono, quindi niente più cast.
      const patch: TablesUpdate<"evaluations"> = {
        is_completed: next,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("evaluations")
        .update(patch)
        .eq("id", id)
        .eq("user_id", uid); // sicurezza: mai righe di altri utenti
      if (error) throw error;
      return { id, next };
    },
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: ["evaluations"] });
      const previous = qc.getQueryData<Evaluation[]>(["evaluations"]);
      qc.setQueryData<Evaluation[]>(["evaluations"], (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, is_completed: next } : item)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const previous = (context as { previous?: Evaluation[] } | undefined)?.previous;
      if (previous) qc.setQueryData(["evaluations"], previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["evaluations"] }),
  });
}

export function useDeleteAllEvaluations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uid = await getUid();
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("evaluations")
        .delete()
        .eq("user_id", uid);
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
      const { data, error } = await supabase
        .from("mini_lessons")
        .select("id, title, context_id")
        .eq("user_id", uid)
        .order("lesson_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; context_id: string | null }[];
    },
  });
}