import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useSaveStatus } from "@/contexts/SaveStatusContext";

/**
 * Wrapper sopra useMutation che riporta automaticamente lo stato
 * (saving / saved / error) al SaveStatusContext per l'indicatore globale.
 *
 * 🔩 P19c — I BULLONI UNIVERSALI: le firme delle callback di react-query
 * cambiano tra la 5.83 (il tornio di Lovable) e la 5.101 (il nostro):
 * mutateCtx in onMutate, mutation in onSuccess/onError. Con parametri
 * "espliciti" il bullone avvita da una parte e si spana dall'altra
 * (e infatti il typecheck di Lovable protestava!). Qui i callback
 * prendono SOLO gli argomenti di sempre e catturano gli extra con
 * ...rest: una forma accettata dal typecheck in ENTRAMBE le versioni,
 * che a runtime inoltra comunque tutto ai callback del chiamante.
 */
export function useTrackedMutation<TData, TError, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const { reportSaving, reportSaved, reportError } = useSaveStatus();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onMutate: async (vars, ...rest) => {
      reportSaving();
      const fn = options.onMutate as unknown as ((...args: unknown[]) => unknown) | undefined;
      return fn
        ? ((await fn(vars, ...rest)) as TContext)
        : (undefined as unknown as TContext);
    },
    onSuccess: (data, vars, ctx, ...rest) => {
      reportSaved();
      const fn = options.onSuccess as unknown as ((...args: unknown[]) => unknown) | undefined;
      return fn?.(data, vars, ctx, ...rest);
    },
    onError: (err, vars, ctx, ...rest) => {
      const message = err instanceof Error ? err.message : undefined;
      reportError(message);
      const fn = options.onError as unknown as ((...args: unknown[]) => unknown) | undefined;
      return fn?.(err, vars, ctx, ...rest);
    },
  });
}
