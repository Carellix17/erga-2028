export const FREE_LIMIT_MESSAGE = "Limite di generazione raggiunto.";

export function useGenerationUsage() {
  return { data: { unlimited: true, remaining: 10 }, isLoading: false, isError: false };
}

export function useInvalidateGenerationUsage() {
  return () => {};
}
