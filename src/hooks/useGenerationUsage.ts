import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";

export interface GenerationUsage {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

const usageKey = (userId: string | null) => ["generation-usage", userId] as const;

/**
 * Espone il consumo del piano gratuito beta (5 mini-lezioni).
 * Le lezioni dei contesti demo NON contano nel limite.
 */
export function useGenerationUsage() {
  const { currentUser } = useAuth();
  return useQuery<GenerationUsage>({
    queryKey: usageKey(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ used?: number; limit?: number; remaining?: number; unlimited?: boolean }>(
        "get-lessons",
        { userId: currentUser, action: "getUsage" },
      );
      return {
        used: data.used ?? 0,
        limit: data.limit ?? 5,
        remaining: data.remaining ?? Math.max(0, (data.limit ?? 5) - (data.used ?? 0)),
        unlimited: !!data.unlimited,
      };
    },
    enabled: !!currentUser,
    staleTime: 30_000,
  });
}

export function useInvalidateGenerationUsage() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: usageKey(currentUser) });
}

export const FREE_LIMIT_MESSAGE =
  "Hai raggiunto il limite di 5 lezioni gratuite per la beta. Per continuare a usare Erga senza limiti contattaci!";