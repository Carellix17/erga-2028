/**
 * @vitest-environment node
 *
 * Collaudo della migrazione dei contatori anonimi su Postgres (PGlite).
 * Simula i privilegi di default di Supabase prima dell'apply.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20261119150000_ai_cost_counters_anonymous.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

const setupSql = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT;
  END IF;
END $$;

-- Privilegi di default di Supabase, prima che la migrazione crei gli oggetti.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE TABLE public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  fn text,
  provider text,
  model text,
  ok boolean NOT NULL DEFAULT true,
  status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  duration_ms integer
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_insert_authenticated" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_profiles (
  user_id text PRIMARY KEY,
  is_beta_tester boolean NOT NULL DEFAULT false
);
CREATE TABLE public.subscriptions (
  user_id text NOT NULL,
  status text NOT NULL
);
`;

type Db = PGlite;

let db: Db;

async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const result = await db.query<T>(sql, params);
  return result.rows;
}

async function asRole<T>(role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

async function fails(sql: string, pattern: RegExp) {
  await expect(db.exec(sql)).rejects.toThrow(pattern);
}

describe("migrazione contatori anonimi", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(setupSql);
    await db.exec(migrationSql);
  }, 30_000);

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.exec("RESET ROLE");
    await db.exec("DELETE FROM public.ai_usage");
    await db.exec("DELETE FROM public.ai_price_lists");
    await db.exec("DELETE FROM public.ai_cost_weekly_totals");
    await db.exec("DELETE FROM public.subscriptions");
    await db.exec("DELETE FROM public.user_profiles");
  });

  it("documenta la soglia di 10 richieste e il job di purge", () => {
    expect(migrationSql).toContain(
      "Prima di deployare la PR 2 deve esistere il job `purge-ai-cost-rows-90d` in `cron.job`. Se manca, la PR 2 non va in produzione.",
    );
    expect(migrationSql).toContain(
      "SELECT jobname, schedule, active",
    );
    expect(migrationSql).toContain(
      "In fase anonima la soglia k conta eventi, non persone: una cella può corrispondere a una sola persona.",
    );
    expect(migrationSql).toContain("10 richieste, non persone");
    expect(migrationSql.trimStart().startsWith("--")).toBe(true);
    expect(migrationSql).toMatch(/\bBEGIN;\s/);
    expect(migrationSql.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migrationSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.v_cfo_ai_usage_daily/i);
    expect(migrationSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.v_cfo_ai_usage_weekly_user/i);
    expect(migrationSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.v_cfo_ai_usage_calls/i);
    expect(migrationSql).not.toMatch(/\bhmac\s*\(/i);
    expect(migrationSql).not.toMatch(/PASSWORD\s+'/i);
    expect(migrationSql).not.toMatch(/\bUPDATE\s+public\.ai_usage\b/i);
  });

  it("non espone identità e non conta il segmento dai log", async () => {
    const forbidden = await query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('ai_usage', 'ai_cost_weekly_totals', 'v_cfo_ai_cost_weekly')
        AND column_name ~* '(^ip$|ip_address|user_agent|session_id|device_id|signup_week|user_id|hash|email)'
        AND NOT (table_name = 'ai_usage' AND column_name = 'user_id')
    `);
    expect(forbidden).toEqual([]);

    const gone = await query<{ daily: string | null; contatori: string | null; per_utente: string | null }>(`
      SELECT to_regclass('public.v_cfo_ai_usage_daily') AS daily,
             to_regclass('public.v_cfo_contatori') AS contatori,
             to_regclass('public.v_cfo_ai_usage_weekly_user') AS per_utente
    `);
    expect(gone[0]).toEqual({ daily: null, contatori: null, per_utente: null });

    const guard = await query<{ def: string }>(
      `SELECT pg_get_functiondef('public.ai_usage_guard_piano_nome()'::regprocedure) AS def`,
    );
    expect(guard[0].def).not.toMatch(/from\s+public\.ai_usage/i);
    expect(guard[0].def).toMatch(/ai_segment_subscriber_count/);

    const definer = await query<{ proname: string; prosecdef: boolean }>(`
      SELECT p.proname, p.prosecdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('purge_ai_cost_rows_older_than_90_days', 'ai_cost_weekly_aggregate')
    `);
    const byName = Object.fromEntries(definer.map((row) => [row.proname, row.prosecdef]));
    expect(byName.purge_ai_cost_rows_older_than_90_days).toBe(false);
    expect(byName.ai_cost_weekly_aggregate).toBe(true);
  });

  it("revoca i privilegi di default a anon e authenticated", async () => {
    const roles = ["anon", "authenticated"] as const;
    const relations = [
      "public.v_cfo_ai_cost_weekly",
      "public.ai_usage",
      "public.ai_price_lists",
      "public.ai_cost_weekly_totals",
    ];
    for (const role of roles) {
      for (const relation of relations) {
        const rows = await query<{ ok: boolean }>(
          `SELECT has_table_privilege($1, $2, 'SELECT') AS ok`,
          [role, relation],
        );
        expect(rows[0].ok, `${role} SELECT ${relation}`).toBe(false);
      }
      const execute = await query<{ ok: boolean }>(
        `SELECT has_function_privilege($1, 'public.purge_ai_cost_rows_older_than_90_days()', 'EXECUTE') AS ok`,
        [role],
      );
      expect(execute[0].ok, `${role} EXECUTE purge`).toBe(false);
    }
  });

  it("tronca created_at all'ora UTC", async () => {
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, created_at)
      VALUES ('chat', true, '2026-11-19 14:37:21+00')
    `);
    const rows = await query<{ ts: string }>(`
      SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS ts
      FROM public.ai_usage
    `);
    expect(rows[0].ts).toBe("2026-11-19 14:00:00");
  });

  it("rifiuta i valori fuori elenco e azzera il piano sotto i 10 iscritti", async () => {
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, segmento) VALUES ('chat', true, 'scuola')`,
      /ai_usage_segmento_check/,
    );
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, feature) VALUES ('chat', true, 'prompt dello studente')`,
      /ai_usage_feature_check/,
    );
    await db.exec(
      `INSERT INTO public.ai_usage (fn, ok, segmento, piano_nome) VALUES ('chat', true, 'free', 'mensile')`,
    );
    const stripped = await query<{ piano: string | null }>(
      `SELECT piano_nome AS piano FROM public.ai_usage`,
    );
    expect(stripped[0].piano).toBeNull();

    await db.exec("DELETE FROM public.ai_usage");
    await insertProfiles(10);
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, segmento, piano_nome)
       VALUES ('chat', true, 'free', 'Piano di Mario Rossi')`,
      /ai_usage_piano_nome_check/,
    );
  });

  it("con 9 iscritti il segmento pubblicato è altri, con 10 resta visibile", async () => {
    await insertProfiles(9);
    await insertEvents({ n: 12, feature: "chat", piano: "mensile" });
    const hidden = await weekly();
    expect(hidden).toEqual([
      expect.objectContaining({ segmento: "altri", piano_nome: "altri", feature: "chat", n_richieste: 12 }),
    ]);

    await db.exec("DELETE FROM public.ai_usage");
    await db.exec(
      `INSERT INTO public.user_profiles (user_id, is_beta_tester) VALUES ('iscritto-10', false)`,
    );
    await insertEvents({ n: 12, feature: "chat", piano: "mensile" });
    const shown = await weekly();
    expect(shown).toEqual([
      expect.objectContaining({ segmento: "free", piano_nome: "mensile", feature: "chat", n_richieste: 12 }),
    ]);
  });

  it("non permette di ricostruire 3 richieste TTS sotto soglia", async () => {
    await insertProfiles(10);
    await insertEvents({ n: 12, feature: "chat", piano: "mensile" });
    await insertEvents({ n: 3, feature: "tts", piano: "mensile" });

    const rows = await weekly();
    expect(rows.map((row) => row.feature)).toEqual(["chat"]);
    expect(rows[0].n_richieste).toBe(12);
    const total = rows.reduce((sum, row) => sum + row.n_richieste, 0);
    expect(total).toBe(12);
    expect(rows.some((row) => row.feature === "tts" || row.n_richieste === 3)).toBe(false);
  });

  it("archivia solo le celle da almeno 10 richieste e non conta due volte", async () => {
    await insertProfiles(10);
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, feature, provider, model, segmento, piano_nome, prompt_tokens, created_at)
      SELECT 'chat', true, 'chat', 'google', 'gemini-test', 'free', 'mensile', 10,
             now() - interval '91 days'
      FROM generate_series(1, 12)
    `);
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, feature, provider, model, segmento, piano_nome, created_at)
      SELECT 'tts', true, 'tts', 'azure', 'azure-tts', 'free', 'mensile',
             now() - interval '91 days'
      FROM generate_series(1, 3)
    `);
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, feature, segmento, created_at)
      VALUES ('chat', true, 'chat', 'free', now() - interval '2 days')
    `);
    await db.exec(`
      INSERT INTO public.ai_price_lists (
        price_list_version, effective_from, provider, model,
        input_per_million, cached_input_per_million, output_per_million
      ) VALUES (
        '2026-11-19', now() - interval '200 days', 'google', 'gemini-test',
        0.1, 0.02, 0.4
      )
    `);

    const first = await query<{ n: string }>(
      `SELECT public.purge_ai_cost_rows_older_than_90_days()::text AS n`,
    );
    expect(Number(first[0].n)).toBe(15);
    const archived = await query<{ feature: string; n_richieste: number }>(`
      SELECT feature, n_richieste::int AS n_richieste
      FROM public.ai_cost_weekly_totals
      ORDER BY feature
    `);
    expect(archived).toEqual([{ feature: "chat", n_richieste: 12 }]);

    const second = await query<{ n: string }>(
      `SELECT public.purge_ai_cost_rows_older_than_90_days()::text AS n`,
    );
    expect(Number(second[0].n)).toBe(0);
    const still = await query<{ n_richieste: number }>(
      `SELECT n_richieste::int AS n_richieste FROM public.ai_cost_weekly_totals`,
    );
    expect(still).toEqual([{ n_richieste: 12 }]);

    const left = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.ai_usage`);
    expect(left[0].n).toBe(1);
    const lists = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.ai_price_lists`);
    expect(lists[0].n).toBe(1);
  });

  it("il CFO legge solo i totali settimanali", async () => {
    await insertProfiles(10);
    await insertEvents({ n: 12, feature: "chat", piano: null });

    const seen = await asRole("cfo_readonly", () =>
      query<{ n: number }>(`SELECT count(*)::int AS n FROM public.v_cfo_ai_cost_weekly`),
    );
    expect(seen[0].n).toBe(1);

    await asRole("cfo_readonly", async () => {
      await fails(`SELECT * FROM public.ai_usage`, /permission denied/i);
      await fails(`SELECT * FROM public.ai_price_lists`, /permission denied/i);
      await fails(`SELECT * FROM public.user_profiles`, /permission denied/i);
      await fails(`SELECT public.purge_ai_cost_rows_older_than_90_days()`, /permission denied/i);
    });

    const grants = await query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.role_table_grants
      WHERE grantee = 'cfo_readonly' AND privilege_type = 'SELECT'
      ORDER BY table_name
    `);
    expect(grants.map((row) => row.table_name).sort()).toEqual([
      "ai_cost_weekly_totals",
      "v_cfo_ai_cost_weekly",
    ]);
  });

  it("si può rieseguire dentro la transazione del file", async () => {
    await db.exec(migrationSql);
    const views = await query<{ name: string }>(`
      SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname LIKE 'v_cfo%'
      ORDER BY 1
    `);
    expect(views.map((row) => row.name)).toEqual(["v_cfo_ai_cost_weekly"]);
  });
});

async function weekly() {
  return query<{
    segmento: string;
    piano_nome: string;
    feature: string;
    n_richieste: number;
  }>(`
    SELECT segmento, piano_nome, feature, n_richieste::int AS n_richieste
    FROM public.v_cfo_ai_cost_weekly
    ORDER BY feature
  `);
}

async function insertProfiles(n: number) {
  await db.exec(`
    INSERT INTO public.user_profiles (user_id, is_beta_tester)
    SELECT 'iscritto-' || g.n::text, false
    FROM generate_series(1, ${n}) AS g(n)
    ON CONFLICT (user_id) DO NOTHING
  `);
}

async function insertEvents(opts: { n: number; feature: string; piano: string | null }) {
  const pianoSql = opts.piano === null ? "NULL" : `'${opts.piano}'`;
  await db.exec(`
    INSERT INTO public.ai_usage (
      fn, provider, model, ok, feature, segmento, piano_nome, prompt_tokens, created_at
    )
    SELECT '${opts.feature}',
           'google',
           'gemini-test',
           true,
           '${opts.feature}',
           'free',
           ${pianoSql},
           10,
           timestamptz '2026-11-19 10:37:00+00'
    FROM generate_series(1, ${opts.n}) AS g(n)
  `);
}
