class FixtureQuery implements PromiseLike<{ data: unknown; error: null }> {
  constructor(private readonly table: string) {}

  select() { return this; }
  update() { return this; }
  insert() { return this; }
  delete() { return this; }
  eq() { return this; }
  order() { return this; }
  gte() { return this; }
  lte() { return this; }
  lt() { return this; }
  maybeSingle() {
    return Promise.resolve({
      data: this.table === "user_profiles" ? { last_studio_context_id: "visual-context" } : null,
      error: null,
    });
  }
  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

/** All database access in the visual fixture resolves locally; no Supabase client is created. */
export const supabase = {
  from: (table: string) => new FixtureQuery(table),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
