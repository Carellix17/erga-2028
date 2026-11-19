/**
 * @vitest-environment node
 *
 * Collaudo della migrazione dei contatori anonimi su Postgres (PGlite).
 * Copre la soglia k, i CHECK, la retention, l'orario all'ora e il ruolo CFO.
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

const baseSql = `
CREATE SCHEMA IF NOT EXISTS public;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END $$;
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
`;

// auth.uid() non esiste in un Postgres nudo: la policy preesistente
// viene eliminata dalla migrazione, ma per crearla serve la funzione.
const authStub = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
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
    await db.exec(authStub);
    await db.exec(baseSql);
    await db.exec(migrationSql);
  }, 30_000);

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.exec("RESET ROLE");
    await db.exec("DELETE FROM public.ai_usage");
    await db.exec("DELETE FROM public.ai_price_lists");
  });

  it("non crea viste per utente o per chiamata, né segreti", () => {
    expect(migrationSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.v_cfo_ai_usage_weekly_user/i);
    expect(migrationSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.v_cfo_ai_usage_calls/i);
    expect(migrationSql).not.toMatch(/\bhmac\s*\(/i);
    expect(migrationSql).not.toMatch(/CREATE\s+EXTENSION[^;]{0,80}pgcrypto/i);
    expect(migrationSql).not.toMatch(/PASSWORD\s+'/i);
    expect(migrationSql).not.toMatch(/\bUPDATE\s+public\.ai_usage\b/i);
    expect(migrationSql).not.toMatch(/REFERENCES\s+(auth|public)\.(users|user_profiles|subscriptions|study_sessions_logs|focus_sessions)/i);
  });

  it("non espone user_id e non ha colonne di rete, sessione o dispositivo", async () => {
    const forbidden = await query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'ai_usage' AND column_name ~* '(^ip$|ip_address|user_agent|session_id|device_id|signup_week|user_id_hash|coorte)')
          OR (table_name LIKE 'v_cfo%' AND column_name ~* '(user_id|hash|signup|coorte|ip|user_agent|session|device|email)')
        )
    `);
    expect(forbidden).toEqual([]);

    const missingViews = await query<{ utente: string | null; chiamate: string | null }>(`
      SELECT to_regclass('public.v_cfo_ai_usage_weekly_user') AS utente,
             to_regclass('public.v_cfo_ai_usage_calls') AS chiamate
    `);
    expect(missingViews[0]).toEqual({ utente: null, chiamate: null });

    const foreignKeys = await query<{ n: number }>(`
      SELECT count(*)::int AS n
      FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid IN ('public.ai_usage'::regclass, 'public.ai_price_lists'::regclass)
    `);
    expect(foreignKeys[0].n).toBe(0);

    const definitions = await query<{ def: string }>(`
      SELECT pg_get_viewdef(c.oid, true) AS def
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname LIKE 'v_cfo%'
    `);
    expect(definitions.length).toBe(3);
    for (const row of definitions) {
      expect(row.def).not.toMatch(/auth\.users|user_profiles|subscriptions|study_sessions|focus_sessions|storage\.objects/);
    }

    const options = await query<{ relname: string; reloptions: string[] | null }>(`
      SELECT c.relname, c.reloptions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname LIKE 'v_cfo%'
    `);
    expect(options).toHaveLength(3);
    for (const row of options) {
      expect(row.reloptions ?? []).toContain("security_barrier=true");
      expect(row.reloptions ?? []).not.toContain("security_invoker=true");
    }
  });

  it("tronca created_at all'ora UTC, anche se il client manda i secondi", async () => {
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, created_at)
      VALUES ('chat', true, '2026-11-19 14:37:21+00')
    `);
    const rows = await query<{ ts: string }>(`
      SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS ts
      FROM public.ai_usage
    `);
    expect(rows[0].ts).toBe("2026-11-19 14:00:00");

    await db.exec("DELETE FROM public.ai_usage");
    await db.exec("INSERT INTO public.ai_usage (fn, ok) VALUES ('chat', true)");
    const clock = await query<{ minute: number; second: number }>(`
      SELECT extract(minute FROM created_at AT TIME ZONE 'UTC')::int AS minute,
             extract(second FROM created_at AT TIME ZONE 'UTC')::int AS second
      FROM public.ai_usage
    `);
    expect(clock[0]).toEqual({ minute: 0, second: 0 });
  });

  it("rifiuta i valori fuori dagli elenchi chiusi", async () => {
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, segmento) VALUES ('chat', true, 'scuola')`,
      /ai_usage_segmento_check/,
    );
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, feature) VALUES ('chat', true, 'prompt dello studente')`,
      /ai_usage_feature_check/,
    );
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, esito) VALUES ('chat', true, 'errore: il prompt era')`,
      /ai_usage_esito_check/,
    );
    await db.exec(
      `INSERT INTO public.ai_usage (fn, ok, piano_nome) VALUES ('chat', true, 'Piano di Mario Rossi')`,
    );
    const stripped = await query<{ n: number }>(
      `SELECT count(piano_nome)::int AS n FROM public.ai_usage`,
    );
    expect(stripped[0].n).toBe(0);

    await db.exec("DELETE FROM public.ai_usage");
    await insertEvents({ n: 10, userId: "distinct", piano: null });
    await fails(
      `INSERT INTO public.ai_usage (user_id, fn, ok, feature, segmento, piano_nome)
       VALUES ('00000000-0000-4000-8000-000000000001'::uuid, 'chat', true, 'chat', 'pagante', 'Piano di Mario Rossi')`,
      /ai_usage_piano_nome_check/,
    );
    await fails(
      `INSERT INTO public.ai_usage (fn, ok, cached_prompt_tokens) VALUES ('chat', true, -1)`,
      /ai_usage_cached_prompt_tokens_check/,
    );
  });

  it("omette le celle sotto 10 eventi e sotto 10 utenti quando l'id c'è", async () => {
    await insertEvents({ n: 9, userId: null, piano: "mensile" });
    expect(await publishedDays()).toBe(0);
    expect(await publishedWeeks()).toBe(0);
    expect(await publishedCounters()).toBe(0);

    await insertEvents({ n: 1, userId: null, piano: "mensile" });
    const stored = await query<{ con_nome: number }>(`
      SELECT count(piano_nome)::int AS con_nome FROM public.ai_usage
    `);
    expect(stored[0].con_nome).toBe(0);
    const daily = await query<{ n_eventi: number; piano_nome: string | null; segmento: string }>(`
      SELECT n_eventi::int AS n_eventi, piano_nome, segmento
      FROM public.v_cfo_ai_usage_daily
    `);
    expect(daily).toEqual([{ n_eventi: 10, piano_nome: null, segmento: "pagante" }]);
    expect(await publishedWeeks()).toBe(1);
    expect(await publishedCounters()).toBe(1);

    await db.exec("DELETE FROM public.ai_usage");
    await insertEvents({ n: 10, userId: "one", piano: "mensile" });
    expect(await publishedDays()).toBe(0);

    await db.exec("DELETE FROM public.ai_usage");
    await insertEvents({ n: 10, userId: "distinct", piano: "annuale" });
    const notYet = await query<{ piano_nome: string | null; n_eventi: number }>(`
      SELECT piano_nome, n_eventi::int AS n_eventi FROM public.v_cfo_ai_usage_daily
    `);
    expect(notYet).toEqual([{ piano_nome: null, n_eventi: 10 }]);

    await insertEvents({ n: 10, userId: "distinct", piano: "annuale" });
    const named = await query<{ piano_nome: string | null; n_eventi: number }>(`
      SELECT piano_nome, n_eventi::int AS n_eventi FROM public.v_cfo_ai_usage_daily
    `);
    expect(named).toEqual([{ piano_nome: "annuale", n_eventi: 20 }]);
  });

  it("non mostra il nome del piano se nella cella i nomi sono più di uno", async () => {
    await insertEvents({ n: 10, userId: "distinct", piano: "mensile", tokensFrom: 1 });
    await insertEvents({ n: 10, userId: "distinct", piano: "annuale", tokensFrom: 100, idOffset: 20 });
    const rows = await query<{ piano_nome: string | null; n_eventi: number }>(`
      SELECT piano_nome, n_eventi::int AS n_eventi
      FROM public.v_cfo_ai_usage_daily
    `);
    expect(rows).toEqual([{ piano_nome: null, n_eventi: 20 }]);
  });

  it("calcola P50 e P90 sulle chiamate, non sugli utenti", async () => {
    await insertEvents({ n: 10, userId: null, piano: null, tokensFrom: 1 });
    const rows = await query<{ p50: string; p90: string; avg: string }>(`
      SELECT prompt_tokens_p50::text AS p50,
             prompt_tokens_p90::text AS p90,
             prompt_tokens_avg::text AS avg
      FROM public.v_cfo_contatori
    `);
    expect(Number(rows[0].p50)).toBe(5.5);
    expect(Number(rows[0].p90)).toBe(9.1);
    expect(Number(rows[0].avg)).toBe(5.5);
  });

  it("cancella solo le righe di ai_usage più vecchie di 90 giorni", async () => {
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, created_at, feature, segmento)
      VALUES
        ('chat', true, now() - interval '91 days', 'chat', 'free'),
        ('chat', true, now() - interval '10 days', 'chat', 'free')
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

    const deleted = await query<{ n: string }>(
      `SELECT public.purge_ai_cost_rows_older_than_90_days()::text AS n`,
    );
    expect(Number(deleted[0].n)).toBe(1);

    const left = await query<{ age_days: number }>(`
      SELECT floor(extract(epoch FROM (now() - created_at)) / 86400)::int AS age_days
      FROM public.ai_usage
    `);
    expect(left).toHaveLength(1);
    expect(left[0].age_days).toBeLessThan(90);

    const lists = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.ai_price_lists`);
    expect(lists[0].n).toBe(1);
  });

  it("nega al CFO e al client il grezzo, e lascia scrivere solo alla service role", async () => {
    await insertEvents({ n: 10, userId: null, piano: null });

    const cfoDays = await asRole("cfo_readonly", () =>
      query<{ n: number }>(`SELECT count(*)::int AS n FROM public.v_cfo_ai_usage_daily`),
    );
    expect(cfoDays[0].n).toBe(1);

    await asRole("cfo_readonly", async () => {
      await fails(`SELECT * FROM public.ai_usage`, /permission denied/i);
      await fails(`SELECT * FROM public.ai_price_lists`, /permission denied/i);
      await fails(`SELECT user_id FROM public.v_cfo_ai_usage_daily`, /user_id/);
      await fails(`SELECT public.purge_ai_cost_rows_older_than_90_days()`, /permission denied/i);
    });

    await asRole("anon", async () => {
      await fails(
        `INSERT INTO public.ai_usage (fn, ok) VALUES ('chat', true)`,
        /permission denied/i,
      );
      await fails(`SELECT * FROM public.v_cfo_ai_usage_daily`, /permission denied/i);
    });

    await asRole("authenticated", async () => {
      await fails(
        `INSERT INTO public.ai_usage (fn, ok) VALUES ('chat', true)`,
        /permission denied/i,
      );
    });

    await asRole("service_role", async () => {
      await db.exec(`INSERT INTO public.ai_usage (fn, ok, feature, segmento) VALUES ('chat', true, 'chat', 'free')`);
    });
    const written = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.ai_usage`);
    expect(written[0].n).toBe(11);

    const grants = await query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.role_table_grants
      WHERE grantee = 'cfo_readonly' AND privilege_type = 'SELECT'
      ORDER BY table_name
    `);
    expect(grants.map((row) => row.table_name)).toEqual([
      "v_cfo_ai_usage_daily",
      "v_cfo_ai_usage_weekly_segment",
      "v_cfo_contatori",
    ]);
  });

  it("si può rieseguire e la seconda passata pulisce ancora il grezzo vecchio", async () => {
    await db.exec(`
      INSERT INTO public.ai_usage (fn, ok, created_at)
      VALUES ('chat', true, now() - interval '120 days'),
             ('chat', true, now() - interval '1 day')
    `);
    await db.exec(migrationSql);
    const left = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.ai_usage`);
    expect(left[0].n).toBe(1);
    const views = await query<{ n: number }>(`
      SELECT count(*)::int AS n FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relname LIKE 'v_cfo%' AND c.relkind = 'v'
    `);
    expect(views[0].n).toBe(3);
  });
});

async function publishedDays() {
  const rows = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.v_cfo_ai_usage_daily`);
  return rows[0].n;
}

async function publishedWeeks() {
  const rows = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.v_cfo_ai_usage_weekly_segment`,
  );
  return rows[0].n;
}

async function publishedCounters() {
  const rows = await query<{ n: number }>(`SELECT count(*)::int AS n FROM public.v_cfo_contatori`);
  return rows[0].n;
}

async function insertEvents(opts: {
  n: number;
  userId: null | "one" | "distinct";
  piano: string | null;
  tokensFrom?: number;
  idOffset?: number;
}) {
  const pianoSql = opts.piano === null ? "NULL" : `'${opts.piano}'`;
  const tokenSql =
    opts.tokensFrom === undefined ? "NULL" : `${opts.tokensFrom} + g.n - 1`;
  const offset = opts.idOffset ?? 0;
  const userSql =
    opts.userId === null
      ? "NULL"
      : opts.userId === "one"
        ? `'00000000-0000-4000-8000-000000000001'::uuid`
        : `('00000000-0000-4000-8000-' || lpad((${offset} + g.n)::text, 12, '0'))::uuid`;

  await db.exec(`
    INSERT INTO public.ai_usage (
      user_id, fn, provider, model, ok, feature, segmento, piano_nome,
      prompt_tokens, created_at
    )
    SELECT ${userSql},
           'chat',
           'google',
           'gemini-test',
           true,
           'chat',
           'pagante',
           ${pianoSql},
           ${tokenSql},
           timestamptz '2026-11-19 10:37:00+00'
    FROM generate_series(1, ${opts.n}) AS g(n)
  `);
}
