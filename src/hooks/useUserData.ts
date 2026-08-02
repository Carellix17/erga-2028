import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { useTrackedMutation } from "./useTrackedMutation";

export const userDataKey = (userId: string | null, key: string) =>
  ["user-data", userId, key] as const;

/**
 * Hook KV cloud-backed.
 * - Cache 5 min via React Query (zero spinner tra le tab dopo il primo fetch).
 * - Optimistic update istantaneo + retry automatico.
 * - Stato di salvataggio segnalato all'indicatore globale.
 * Mantiene l'API pubblica { data, updateData, isLoaded }.
 */
export function useUserData<T>(key: string, defaultValue: T) {
  const { isAuthenticated, currentUser } = useAuth();
  const qc = useQueryClient();
  const enabled = isAuthenticated && !!currentUser;

  const query = useQuery<T>({
    queryKey: userDataKey(currentUser, key),
    queryFn: async () => {
      const result = await edgeFetch<{ value: T | null }>("user-data", {
        action: "get",
        key,
        userId: currentUser,
      });
      return (result.value ?? defaultValue) as T;
    },
    enabled,
    initialData: enabled ? undefined : defaultValue,
  });

  const mutation = useTrackedMutation<unknown, Error, T, { previous: T | undefined }>({
    mutationFn: async (value: T) => {
      if (!currentUser) return null;
      return edgeFetch("user-data", { action: "save", key, value, userId: currentUser });
    },
    onMutate: async (next) => {
      const qk = userDataKey(currentUser, key);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<T>(qk);
      qc.setQueryData<T>(qk, next);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(userDataKey(currentUser, key), ctx.previous);
      }
    },
  });

  const updateData = useCallback(
    (newData: T | ((prev: T) => T)) => {
      const qk = userDataKey(currentUser, key);
      const prev = (qc.getQueryData<T>(qk) ?? query.data ?? defaultValue) as T;
      const next =
        typeof newData === "function"
          ? (newData as (p: T) => T)(prev)
          : newData;
      // Optimistic update immediato
      qc.setQueryData<T>(qk, next);
      if (enabled) mutation.mutate(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, key, enabled, qc, query.data]
  );

  return {
    data: (query.data ?? defaultValue) as T,
    updateData,
    isLoaded: query.isFetched || !enabled,
  };
}
