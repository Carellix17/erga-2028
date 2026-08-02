import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { useTrackedMutation } from "./useTrackedMutation";
import { lessonsKeys } from "./useLessons";

export interface FileContext {
  id: string;
  file_name: string;
  created_at: string;
  lesson_count: number;
  file_path?: string | null;
  new_material_pending?: boolean;
}

export const fileContextsKey = (userId: string | null) =>
  ["file-contexts", userId] as const;

export function useFileContextsQuery() {
  const { currentUser } = useAuth();
  return useQuery<FileContext[]>({
    queryKey: fileContextsKey(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ contexts?: FileContext[] }>("delete-context", {
        userId: currentUser,
        action: "list",
      });
      return data.contexts ?? [];
    },
    enabled: !!currentUser,
  });
}

export function useDeleteFileContext() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, string, { previous?: FileContext[] }>({
    mutationFn: (contextId) =>
      edgeFetch("delete-context", {
        userId: currentUser,
        contextId,
        action: "delete",
      }),
    onMutate: async (contextId) => {
      const qk = fileContextsKey(currentUser);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<FileContext[]>(qk);
      if (previous) {
        qc.setQueryData<FileContext[]>(qk, previous.filter((c) => c.id !== contextId));
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(fileContextsKey(currentUser), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: fileContextsKey(currentUser) });
      qc.invalidateQueries({ queryKey: lessonsKeys.all(currentUser) });
    },
  });
}

// 🗑️ P17 — togli UN file dal ripostiglio di un percorso.
// Se era l'ultimo, il server elimina il percorso con le sue lezioni
// (il client lo scopre dal flag contextDeleted della risposta).
export function useRemoveFileFromContext() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<{ contextDeleted?: boolean }, Error, { contextId: string; filePath: string }, unknown>({
    mutationFn: async ({ contextId, filePath }) =>
      edgeFetch<{ contextDeleted?: boolean }>("delete-context", {
        userId: currentUser,
        contextId,
        filePath,
        action: "removeFile",
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: fileContextsKey(currentUser) });
      qc.invalidateQueries({ queryKey: lessonsKeys.all(currentUser) });
    },
  });
}