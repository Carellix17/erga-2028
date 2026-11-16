/** Pending promises and access errors are runtime state, not saved lessons. */
export function shouldPersistLessonQuery(query: { queryKey: readonly unknown[]; state: { status: string } }): boolean {
  return query.queryKey[0] === "lessons" && query.state.status === "success";
}