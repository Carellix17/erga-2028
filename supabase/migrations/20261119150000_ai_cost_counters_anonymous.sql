-- Contatori di costo AI — fase anonima (PR 1).
--
-- Parere GC 19/11/2026 (CONDIZIONI), informativa anonima opzione A,
-- piano CTO §14. Il CFO vede solo totali settimanali.
--
-- Prima di deployare la PR 2 deve esistere il job `purge-ai-cost-rows-90d` in `cron.job`. Se manca, la PR 2 non va in produzione.
--   SELECT jobname, schedule, active
--   FROM cron.job
--   WHERE jobname = 'purge-ai-cost-rows-90d';
--
-- Soglia: 10 richieste, non persone.
-- In fase anonima la soglia k conta eventi, non persone: una cella può
-- corrispondere a una sola persona.
--
-- Una cella giornaliera (giorno Europe/Rome × feature × provider × model
-- × segmento × piano) entra nel totale settimanale solo se ha almeno
-- 10 richieste. Le celle sotto soglia si accorpano in 'altri' e quel
-- secchio si pubblica solo se a sua volta ha almeno 10 richieste.
-- I totali pubblicati possono essere un po' più bassi del reale:
-- il resto sotto soglia non si pubblica e non si può ricostruire
-- sottraendo le viste, perché non c'è una vista giornaliera né un
-- totale che includa le celle soppresse.
--
-- Segmento e nome del piano compaiono solo se quel segmento ha almeno
-- 10 iscritti. Il conteggio NON legge ai_usage (i log). Usa:
--   · public.user_profiles — anagrafica degli iscritti, flag is_beta_tester
--     per il segmento beta e come base del free;
--   · public.subscriptions — status 'trialing' = prova, 'active' = pagante.
--     Un beta tester non viene contato anche come pagante o in prova.
-- Sotto i 10 iscritti la cella pubblicata dice 'altri'.
-- Nessuna chiave esterna e nessuna join riga-per-utente verso auth,
-- sessioni, log o abbonamenti: solo il conteggio per segmento.
--
-- Retention del grezzo: massimo 90 giorni. La funzione, prima di
-- cancellare, ricopia in ai_cost_weekly_totals le celle già sopra
-- soglia. Quella tabella non ha id, non ha orari più fini della
-- settimana, e si conserva senza scadenza. Lanciarla due volte non
-- conta due volte: la seconda passata non trova più righe vecchie.
--
-- La funzione di purge NON è SECURITY DEFINER. Gira con i diritti di
-- chi la chiama: la service role (ha i grant) e pg_cron, che la esegue
-- come il ruolo che ha applicato questa migrazione e che possiede le
-- tabelle. Un DEFINER sulla purge allargherebbe la cancellazione a
-- chiunque possa eseguirla.
-- ai_cost_weekly_aggregate invece è SECURITY DEFINER, con search_path
-- fisso: la vista del CFO la chiama e il CFO non ha SELECT sul grezzo.
-- Restituisce solo celle da almeno 10 richieste.
--
-- Non fa: nessuna chiave HMAC, nessun secret, nessuno pseudonimo,
-- nessuna vista giornaliera, nessuna vista per utente o per chiamata,
-- nessun UPDATE delle righe già presenti.
--
-- Applicare nell'SQL editor di Lovable Cloud, dopo le migrazioni che
-- creano ai_usage, user_profiles e subscriptions. Il file è una sola
-- transazione. Si può rieseguire.

BEGIN;

-- ── Ruoli ──────────────────────────────────────────────────────────────

DO $roles$
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
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cfo_readonly') THEN
    CREATE ROLE cfo_readonly NOLOGIN NOINHERIT;
  END IF;
END
$roles$;

COMMENT ON ROLE cfo_readonly IS
  'Lettura dei soli totali settimanali di costo AI (almeno 10 richieste per cella). Nessun login finché la password non è impostata fuori dal repository. Nessun accesso al grezzo, ai log, ad auth o ai profili.';

-- ── Colonne anonime su ai_usage ────────────────────────────────────────

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS segmento text,
  ADD COLUMN IF NOT EXISTS piano_nome text,
  ADD COLUMN IF NOT EXISTS esito text,
  ADD COLUMN IF NOT EXISTS is_retry boolean,
  ADD COLUMN IF NOT EXISTS attempt_n integer,
  ADD COLUMN IF NOT EXISTS cached_prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS reasoning_tokens integer,
  ADD COLUMN IF NOT EXISTS image_count integer,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS audio_characters integer,
  ADD COLUMN IF NOT EXISTS audio_seconds numeric(12, 3),
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(18, 6),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS estimated_cost_eur numeric(18, 6),
  ADD COLUMN IF NOT EXISTS fx_rate numeric(18, 8),
  ADD COLUMN IF NOT EXISTS fx_source text,
  ADD COLUMN IF NOT EXISTS price_list_version text;

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_feature_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_feature_check
  CHECK (feature IS NULL OR feature IN (
    'spiegazione', 'quiz', 'flashcard', 'ocr_pdf', 'vision_figure',
    'chat', 'chat_auxiliary', 'interrogazione', 'palestra', 'piano',
    'manuale', 'tts', 'demo'
  ));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_segmento_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_segmento_check
  CHECK (segmento IS NULL OR segmento IN ('free', 'prova', 'pagante', 'beta'));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_piano_nome_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_piano_nome_check
  CHECK (piano_nome IS NULL OR piano_nome IN (
    'pro_monthly', 'mensile', 'annuale', 'fondatori'
  ));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_esito_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_esito_check
  CHECK (esito IS NULL OR esito IN ('ok', 'fallita', 'retry'));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_attempt_n_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_attempt_n_check
  CHECK (attempt_n IS NULL OR (attempt_n >= 1 AND attempt_n <= 20));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_cached_prompt_tokens_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_cached_prompt_tokens_check
  CHECK (cached_prompt_tokens IS NULL OR cached_prompt_tokens >= 0);

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_reasoning_tokens_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_reasoning_tokens_check
  CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0);

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_image_count_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_image_count_check
  CHECK (image_count IS NULL OR image_count >= 0);

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_page_count_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_page_count_check
  CHECK (page_count IS NULL OR page_count >= 0);

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_audio_characters_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_audio_characters_check
  CHECK (audio_characters IS NULL OR audio_characters >= 0);

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_audio_seconds_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_audio_seconds_check
  CHECK (audio_seconds IS NULL OR (audio_seconds >= 0 AND audio_seconds < 'Infinity'::numeric));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_estimated_cost_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_estimated_cost_check
  CHECK (estimated_cost IS NULL OR (estimated_cost >= 0 AND estimated_cost < 'Infinity'::numeric));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_currency_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_currency_check
  CHECK (currency IS NULL OR currency IN ('EUR', 'USD'));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_estimated_cost_eur_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_estimated_cost_eur_check
  CHECK (estimated_cost_eur IS NULL OR (estimated_cost_eur >= 0 AND estimated_cost_eur < 'Infinity'::numeric));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_fx_rate_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_fx_rate_check
  CHECK (fx_rate IS NULL OR (fx_rate > 0 AND fx_rate < 'Infinity'::numeric));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_fx_source_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_fx_source_check
  CHECK (fx_source IS NULL OR fx_source IN ('ecb', 'bce', 'listino', 'manuale'));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_price_list_version_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_price_list_version_check
  CHECK (
    price_list_version IS NULL
    OR price_list_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
  );

COMMENT ON COLUMN public.ai_usage.created_at IS
  'Istante troncato all''ora UTC. Le righe scritte prima di questa migrazione possono avere ancora i minuti: non vengono riscritte. In pubblicazione si vede solo la settimana.';

COMMENT ON COLUMN public.ai_usage.piano_nome IS
  'Nome piano a elenco chiuso. Il trigger lo azzera se il segmento ha meno di 10 iscritti in user_profiles/subscriptions. Il logger della PR 2, in fase anonima, scrive NULL.';

COMMENT ON COLUMN public.ai_usage.user_id IS
  'Colonna preesistente. La fase anonima non la espone. Il logger della PR 2 deve scriverla NULL. Nessuna chiave esterna verso auth.users.';

COMMENT ON TABLE public.ai_usage IS
  'Registro tecnico delle chiamate AI. Orario all''ora. Retention massima 90 giorni. Vietato incrociare queste righe con log applicativi, sessioni o auth.';

-- ── Conteggio iscritti per segmento (mai da ai_usage) ──────────────────

CREATE OR REPLACE FUNCTION public.ai_segment_subscriber_count(p_segmento text)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $fn$
  SELECT CASE p_segmento
    WHEN 'beta' THEN (
      SELECT count(*)::bigint
      FROM public.user_profiles
      WHERE is_beta_tester
    )
    WHEN 'prova' THEN (
      SELECT count(DISTINCT s.user_id)::bigint
      FROM public.subscriptions s
      WHERE s.status = 'trialing'
        AND NOT EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = s.user_id AND p.is_beta_tester
        )
    )
    WHEN 'pagante' THEN (
      SELECT count(DISTINCT s.user_id)::bigint
      FROM public.subscriptions s
      WHERE s.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = s.user_id AND p.is_beta_tester
        )
    )
    WHEN 'free' THEN (
      SELECT count(*)::bigint
      FROM public.user_profiles p
      WHERE NOT p.is_beta_tester
        AND NOT EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.user_id = p.user_id
            AND s.status IN ('active', 'trialing')
        )
    )
    ELSE 0::bigint
  END;
$fn$;

COMMENT ON FUNCTION public.ai_segment_subscriber_count(text) IS
  'Iscritti del segmento. beta e free da user_profiles, prova e pagante da subscriptions. Non legge ai_usage.';

-- ── Orario all'ora e nome piano solo sopra i 10 iscritti ───────────────

CREATE OR REPLACE FUNCTION public.ai_usage_truncate_created_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  NEW.created_at := date_trunc(
    'hour',
    COALESCE(NEW.created_at, pg_catalog.now()) AT TIME ZONE 'UTC'
  ) AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ai_usage_truncate_created_at ON public.ai_usage;
CREATE TRIGGER ai_usage_truncate_created_at
  BEFORE INSERT OR UPDATE ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_usage_truncate_created_at();

ALTER TABLE public.ai_usage
  ALTER COLUMN created_at SET DEFAULT (
    date_trunc('hour', (pg_catalog.now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC'
  );

CREATE OR REPLACE FUNCTION public.ai_usage_guard_piano_nome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  IF NEW.piano_nome IS NOT NULL
     AND public.ai_segment_subscriber_count(NEW.segmento) < 10 THEN
    NEW.piano_nome := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ai_usage_guard_piano_nome ON public.ai_usage;
CREATE TRIGGER ai_usage_guard_piano_nome
  BEFORE INSERT OR UPDATE OF piano_nome, segmento ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_usage_guard_piano_nome();

CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx
  ON public.ai_usage (created_at);

CREATE INDEX IF NOT EXISTS ai_usage_feature_created_idx
  ON public.ai_usage (feature, created_at);

-- ── Listini versionati (nessun dato di persona, nessuna retention) ─────

CREATE TABLE IF NOT EXISTS public.ai_price_lists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  price_list_version text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  provider text NOT NULL,
  model text NOT NULL,
  input_per_million numeric(18, 6) NOT NULL,
  cached_input_per_million numeric(18, 6) NOT NULL,
  output_per_million numeric(18, 6) NOT NULL,
  other_unit_cost numeric(18, 6),
  other_unit text,
  currency text NOT NULL DEFAULT 'EUR',
  source_url text,
  verified_on date,
  CONSTRAINT ai_price_lists_version_key UNIQUE (price_list_version, provider, model)
);

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_version_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_version_check
  CHECK (price_list_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$');

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_provider_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_provider_check
  CHECK (provider ~ '^[a-z0-9][a-z0-9._/-]{0,63}$');

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_model_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_model_check
  CHECK (char_length(model) BETWEEN 1 AND 128 AND model !~ '[[:space:]]');

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_window_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_window_check
  CHECK (effective_to IS NULL OR effective_to > effective_from);

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_input_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_input_check
  CHECK (input_per_million >= 0 AND input_per_million < 'Infinity'::numeric);

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_cached_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_cached_check
  CHECK (cached_input_per_million >= 0 AND cached_input_per_million < 'Infinity'::numeric);

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_output_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_output_check
  CHECK (output_per_million >= 0 AND output_per_million < 'Infinity'::numeric);

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_other_cost_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_other_cost_check
  CHECK (other_unit_cost IS NULL OR (other_unit_cost >= 0 AND other_unit_cost < 'Infinity'::numeric));

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_other_unit_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_other_unit_check
  CHECK (other_unit IS NULL OR other_unit IN (
    'per_1k_chars', 'per_minute', 'per_image', 'per_page'
  ));

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_currency_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_currency_check
  CHECK (currency IN ('EUR', 'USD'));

ALTER TABLE public.ai_price_lists DROP CONSTRAINT IF EXISTS ai_price_lists_source_url_check;
ALTER TABLE public.ai_price_lists ADD CONSTRAINT ai_price_lists_source_url_check
  CHECK (
    source_url IS NULL
    OR (char_length(source_url) BETWEEN 12 AND 300 AND source_url LIKE 'https://%')
  );

COMMENT ON TABLE public.ai_price_lists IS
  'Listino macchina per la STIMA. Nessun dato personale, nessuna retention a 90 giorni, nessun accesso al CFO.';

-- ── Totali settimanali che restano dopo i 90 giorni ───────────────────
-- Retention: indefinita. Nessun id, nessun orario più preciso della
-- settimana. Ogni riga ha almeno 10 richieste.

CREATE TABLE IF NOT EXISTS public.ai_cost_weekly_totals (
  settimana date NOT NULL,
  segmento text NOT NULL,
  piano_nome text NOT NULL,
  feature text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  n_richieste bigint NOT NULL,
  prompt_tokens bigint NOT NULL DEFAULT 0,
  cached_prompt_tokens bigint NOT NULL DEFAULT 0,
  completion_tokens bigint NOT NULL DEFAULT 0,
  estimated_cost_eur numeric(18, 6) NOT NULL DEFAULT 0,
  CONSTRAINT ai_cost_weekly_totals_key UNIQUE (
    settimana, segmento, piano_nome, feature, provider, model
  )
);

ALTER TABLE public.ai_cost_weekly_totals DROP CONSTRAINT IF EXISTS ai_cost_weekly_totals_richieste_check;
ALTER TABLE public.ai_cost_weekly_totals ADD CONSTRAINT ai_cost_weekly_totals_richieste_check
  CHECK (n_richieste >= 10);

ALTER TABLE public.ai_cost_weekly_totals DROP CONSTRAINT IF EXISTS ai_cost_weekly_totals_segmento_check;
ALTER TABLE public.ai_cost_weekly_totals ADD CONSTRAINT ai_cost_weekly_totals_segmento_check
  CHECK (segmento IN ('free', 'prova', 'pagante', 'beta', 'altri'));

ALTER TABLE public.ai_cost_weekly_totals DROP CONSTRAINT IF EXISTS ai_cost_weekly_totals_piano_check;
ALTER TABLE public.ai_cost_weekly_totals ADD CONSTRAINT ai_cost_weekly_totals_piano_check
  CHECK (piano_nome IN ('pro_monthly', 'mensile', 'annuale', 'fondatori', 'altri'));

ALTER TABLE public.ai_cost_weekly_totals DROP CONSTRAINT IF EXISTS ai_cost_weekly_totals_tokens_check;
ALTER TABLE public.ai_cost_weekly_totals ADD CONSTRAINT ai_cost_weekly_totals_tokens_check
  CHECK (
    prompt_tokens >= 0
    AND cached_prompt_tokens >= 0
    AND completion_tokens >= 0
    AND estimated_cost_eur >= 0
    AND estimated_cost_eur < 'Infinity'::numeric
  );

COMMENT ON TABLE public.ai_cost_weekly_totals IS
  'Totali settimanali anonimi conservati senza scadenza dopo la cancellazione del grezzo. Soglia: 10 richieste, non persone. In fase anonima la soglia k conta eventi, non persone: una cella può corrispondere a una sola persona. I totali pubblicati possono essere un po'' più bassi del reale. Nessun id e nessun orario più preciso della settimana.';

-- ── Aggregato settimanale ──────────────────────────────────────────────
-- p_cutoff NULL = tutto il grezzo ancora in tabella (vista viva).
-- p_cutoff = 90 days = solo le righe che la purge sta per cancellare.

DROP VIEW IF EXISTS public.v_cfo_contatori;
DROP VIEW IF EXISTS public.v_cfo_ai_usage_weekly_segment;
DROP VIEW IF EXISTS public.v_cfo_ai_usage_daily;
DROP VIEW IF EXISTS public.v_cfo_ai_cost_weekly;
DROP FUNCTION IF EXISTS public.ai_cost_weekly_aggregate(interval);

CREATE FUNCTION public.ai_cost_weekly_aggregate(p_cutoff interval)
RETURNS TABLE (
  settimana date,
  segmento text,
  piano_nome text,
  feature text,
  provider text,
  model text,
  n_richieste bigint,
  prompt_tokens bigint,
  cached_prompt_tokens bigint,
  completion_tokens bigint,
  estimated_cost_eur numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  WITH subscribers AS (
    SELECT 'beta'::text AS segmento, count(*)::bigint AS n_iscritti
    FROM public.user_profiles
    WHERE is_beta_tester
    UNION ALL
    SELECT 'prova'::text, count(DISTINCT s.user_id)::bigint
    FROM public.subscriptions s
    WHERE s.status = 'trialing'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = s.user_id AND p.is_beta_tester
      )
    UNION ALL
    SELECT 'pagante'::text, count(DISTINCT s.user_id)::bigint
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = s.user_id AND p.is_beta_tester
      )
    UNION ALL
    SELECT 'free'::text, count(*)::bigint
    FROM public.user_profiles p
    WHERE NOT p.is_beta_tester
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = p.user_id
          AND s.status IN ('active', 'trialing')
      )
  ),
  daily AS (
    SELECT
      (u.created_at AT TIME ZONE 'Europe/Rome')::date AS giorno,
      date_trunc('week', u.created_at AT TIME ZONE 'Europe/Rome')::date AS settimana,
      COALESCE(u.feature, 'sconosciuta') AS feature,
      COALESCE(u.provider, 'sconosciuta') AS provider,
      COALESCE(u.model, 'sconosciuta') AS model,
      u.segmento AS segmento_grezzo,
      u.piano_nome AS piano_grezzo,
      count(*)::bigint AS n_richieste,
      COALESCE(sum(u.prompt_tokens), 0)::bigint AS prompt_tokens,
      COALESCE(sum(u.cached_prompt_tokens), 0)::bigint AS cached_prompt_tokens,
      COALESCE(sum(u.completion_tokens), 0)::bigint AS completion_tokens,
      COALESCE(sum(u.estimated_cost_eur), 0)::numeric(18, 6) AS estimated_cost_eur
    FROM public.ai_usage u
    WHERE p_cutoff IS NULL
       OR u.created_at < pg_catalog.now() - p_cutoff
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ),
  labeled AS (
    SELECT
      d.settimana,
      d.feature,
      d.provider,
      d.model,
      d.n_richieste,
      d.prompt_tokens,
      d.cached_prompt_tokens,
      d.completion_tokens,
      d.estimated_cost_eur,
      CASE
        WHEN COALESCE(s.n_iscritti, 0) >= 10 THEN COALESCE(d.segmento_grezzo, 'altri')
        ELSE 'altri'
      END AS segmento,
      CASE
        WHEN COALESCE(s.n_iscritti, 0) >= 10 AND d.piano_grezzo IS NOT NULL THEN d.piano_grezzo
        ELSE 'altri'
      END AS piano_nome
    FROM daily d
    LEFT JOIN subscribers s ON s.segmento = d.segmento_grezzo
  ),
  kept AS (
    SELECT
      settimana,
      segmento,
      piano_nome,
      feature,
      provider,
      model,
      sum(n_richieste)::bigint AS n_richieste,
      sum(prompt_tokens)::bigint AS prompt_tokens,
      sum(cached_prompt_tokens)::bigint AS cached_prompt_tokens,
      sum(completion_tokens)::bigint AS completion_tokens,
      sum(estimated_cost_eur)::numeric(18, 6) AS estimated_cost_eur
    FROM labeled
    WHERE n_richieste >= 10
    GROUP BY 1, 2, 3, 4, 5, 6
  ),
  rolled AS (
    SELECT
      settimana,
      'altri'::text AS segmento,
      'altri'::text AS piano_nome,
      'altri'::text AS feature,
      'altri'::text AS provider,
      'altri'::text AS model,
      sum(n_richieste)::bigint AS n_richieste,
      sum(prompt_tokens)::bigint AS prompt_tokens,
      sum(cached_prompt_tokens)::bigint AS cached_prompt_tokens,
      sum(completion_tokens)::bigint AS completion_tokens,
      sum(estimated_cost_eur)::numeric(18, 6) AS estimated_cost_eur
    FROM labeled
    WHERE n_richieste < 10
    GROUP BY settimana
    HAVING sum(n_richieste) >= 10
  )
  SELECT * FROM kept
  UNION ALL
  SELECT * FROM rolled;
$fn$;

COMMENT ON FUNCTION public.ai_cost_weekly_aggregate(interval) IS
  'Totali settimanali. Soglia: 10 richieste, non persone. Somma solo le celle giornaliere con almeno 10 richieste; il resto va in altri e si pubblica solo se anche quel secchio ha almeno 10 richieste. I totali pubblicati possono essere un po'' più bassi del reale.';

CREATE VIEW public.v_cfo_ai_cost_weekly
WITH (security_barrier = true) AS
SELECT
  settimana,
  segmento,
  piano_nome,
  feature,
  provider,
  model,
  n_richieste,
  prompt_tokens,
  cached_prompt_tokens,
  completion_tokens,
  estimated_cost_eur
FROM public.ai_cost_weekly_aggregate(NULL::interval);

COMMENT ON VIEW public.v_cfo_ai_cost_weekly IS
  'Unici totali vivi per il CFO: settimana, non il giorno. Soglia: 10 richieste, non persone. In fase anonima la soglia k conta eventi, non persone: una cella può corrispondere a una sola persona. I totali pubblicati possono essere un po'' più bassi del reale. Segmento e piano sono altri se gli iscritti del segmento sono meno di 10.';

-- ── RLS e grant. I privilegi di default di Supabase vanno revocati. ───

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cost_weekly_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_insert_authenticated" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_insert_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_select_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_update_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_delete_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_price_lists_all_service_role" ON public.ai_price_lists;
DROP POLICY IF EXISTS "ai_cost_weekly_totals_all_service_role" ON public.ai_cost_weekly_totals;

CREATE POLICY "ai_usage_select_service_role" ON public.ai_usage
  FOR SELECT TO service_role USING (true);
CREATE POLICY "ai_usage_insert_service_role" ON public.ai_usage
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ai_usage_update_service_role" ON public.ai_usage
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ai_usage_delete_service_role" ON public.ai_usage
  FOR DELETE TO service_role USING (true);

CREATE POLICY "ai_price_lists_all_service_role" ON public.ai_price_lists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "ai_cost_weekly_totals_all_service_role" ON public.ai_cost_weekly_totals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.ai_usage FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON TABLE public.ai_price_lists FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON TABLE public.ai_cost_weekly_totals FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON TABLE public.v_cfo_ai_cost_weekly FROM PUBLIC, anon, authenticated, cfo_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_price_lists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_cost_weekly_totals TO service_role;

GRANT USAGE ON SCHEMA public TO cfo_readonly;
GRANT SELECT ON TABLE public.v_cfo_ai_cost_weekly TO cfo_readonly, service_role;
GRANT SELECT ON TABLE public.ai_cost_weekly_totals TO cfo_readonly;

REVOKE ALL ON SEQUENCE public.ai_usage_id_seq FROM PUBLIC, anon, authenticated, cfo_readonly;
GRANT USAGE, SELECT ON SEQUENCE public.ai_usage_id_seq TO service_role;

DO $seq$
BEGIN
  IF to_regclass('public.ai_price_lists_id_seq') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON SEQUENCE public.ai_price_lists_id_seq FROM PUBLIC, anon, authenticated, cfo_readonly';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.ai_price_lists_id_seq TO service_role';
  END IF;
END
$seq$;

-- ── Purge: prima archivia, poi cancella. Non è SECURITY DEFINER. ──────

DROP FUNCTION IF EXISTS public.purge_ai_cost_rows_older_than_90_days();

CREATE FUNCTION public.purge_ai_cost_rows_older_than_90_days()
RETURNS bigint
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  deleted_usage bigint;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(hashtext('purge-ai-cost-rows-90d'));

  INSERT INTO public.ai_cost_weekly_totals (
    settimana, segmento, piano_nome, feature, provider, model,
    n_richieste, prompt_tokens, cached_prompt_tokens, completion_tokens,
    estimated_cost_eur
  )
  SELECT
    settimana, segmento, piano_nome, feature, provider, model,
    n_richieste, prompt_tokens, cached_prompt_tokens, completion_tokens,
    estimated_cost_eur
  FROM public.ai_cost_weekly_aggregate(interval '90 days')
  ON CONFLICT (settimana, segmento, piano_nome, feature, provider, model)
  DO UPDATE SET
    n_richieste = public.ai_cost_weekly_totals.n_richieste + EXCLUDED.n_richieste,
    prompt_tokens = public.ai_cost_weekly_totals.prompt_tokens + EXCLUDED.prompt_tokens,
    cached_prompt_tokens = public.ai_cost_weekly_totals.cached_prompt_tokens + EXCLUDED.cached_prompt_tokens,
    completion_tokens = public.ai_cost_weekly_totals.completion_tokens + EXCLUDED.completion_tokens,
    estimated_cost_eur = public.ai_cost_weekly_totals.estimated_cost_eur + EXCLUDED.estimated_cost_eur;

  DELETE FROM public.ai_usage
  WHERE created_at < pg_catalog.now() - interval '90 days';
  GET DIAGNOSTICS deleted_usage = ROW_COUNT;
  RETURN deleted_usage;
END;
$fn$;

COMMENT ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() IS
  'Archivia in ai_cost_weekly_totals le celle con almeno 10 richieste, poi cancella da ai_usage ciò che è più vecchio di 90 giorni. Non è SECURITY DEFINER: la esegue la service role o pg_cron con il ruolo che possiede le tabelle. La seconda esecuzione non conta due volte.';

REVOKE ALL ON FUNCTION public.ai_usage_truncate_created_at() FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON FUNCTION public.ai_usage_guard_piano_nome() FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON FUNCTION public.ai_segment_subscriber_count(text) FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON FUNCTION public.ai_cost_weekly_aggregate(interval) FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() FROM PUBLIC, anon, authenticated, cfo_readonly;

GRANT EXECUTE ON FUNCTION public.ai_usage_truncate_created_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_usage_guard_piano_nome() TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_segment_subscriber_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_cost_weekly_aggregate(interval) TO service_role, cfo_readonly;
GRANT EXECUTE ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() TO service_role;

-- ── Pianificazione, se pg_cron è già presente ──────────────────────────
-- Prima di deployare la PR 2 deve esistere il job
-- `purge-ai-cost-rows-90d` in `cron.job`. Se manca, la PR 2 non va in produzione.

DO $cron$
BEGIN
  IF to_regnamespace('cron') IS NULL
     OR to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE NOTICE 'pg_cron non disponibile: il job purge-ai-cost-rows-90d NON è stato creato. Prima di deployare la PR 2 deve esistere in cron.job. Se manca, la PR 2 non va in produzione. Query: SELECT jobname, schedule, active FROM cron.job WHERE jobname = ''purge-ai-cost-rows-90d'';';
    RETURN;
  END IF;

  IF to_regprocedure('cron.unschedule(bigint)') IS NOT NULL
     AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'purge-ai-cost-rows-90d';
  END IF;

  PERFORM cron.schedule(
    'purge-ai-cost-rows-90d',
    '17 * * * *',
    'SELECT public.purge_ai_cost_rows_older_than_90_days()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron presente ma la pianificazione non è riuscita (%). Prima di deployare la PR 2 deve esistere il job purge-ai-cost-rows-90d in cron.job. Se manca, la PR 2 non va in produzione.', SQLERRM;
END
$cron$;

-- Go-live della retention sulle righe già più vecchie di 90 giorni.
SELECT public.purge_ai_cost_rows_older_than_90_days();

COMMIT;
