import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useSaveStatus } from "@/contexts/SaveStatusContext";

/**
 * Wrapper sopra useMutation che riporta automaticamente lo stato
 * (saving / saved / error) al SaveStatusContext per l'indicatore globale.
 */
export function useTrackedMutation<TData, TError, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const { reportSaving, reportSaved, reportError } = useSaveStatus();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onMutate: async (vars) => {
      reportSaving();
      return options.onMutate ? await options.onMutate(vars) : (undefined as unknown as TContext);
    },
    onSuccess: (data, vars, ctx) => {
      reportSaved();
      return options.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      const message = err instanceof Error ? err.message : undefined;
      reportError(message);
      return options.onError?.(err, vars, ctx);
    },
  });
}