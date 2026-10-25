export const fileContextsKey = (...parts: unknown[]) => ["visual-file-contexts", ...parts];

export function useFileContextsQuery() {
  return { data: [], isLoading: false, isError: false, refetch: async () => ({ data: [] }) };
}

export function useDeleteFileContext() {
  return { mutateAsync: async () => undefined, isPending: false };
}

export function useRemoveFileFromContext() {
  return { mutateAsync: async () => ({ contextDeleted: false }), isPending: false };
}
