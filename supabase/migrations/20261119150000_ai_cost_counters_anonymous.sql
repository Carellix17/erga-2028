-- Contatori di costo AI — fase anonima (PR 1).
--
-- Parere GC 19/11/2026 (CONDIZIONI) e piano CTO §14, che prevale sulle
-- sezioni precedenti dove divergono. Informativa anonima dello stesso
-- giorno, condizioni 2-4.
--
-- Cosa fa questo file, e solo questo:
--   · colonne nuove su public.ai_usage, a elenco chiuso o numeriche;
--   · listino versionato public.ai_price_lists (nessun dato di persona);
--   · viste aggregate per il CFO, soglia k >= 10;
--   · ruolo cfo_readonly, senza login e senza accesso al grezzo;
--   · cancellazione delle righe di ai_usage più vecchie di 90 giorni,
--     eseguita subito e, se pg_cron è già installato, ripetuta ogni ora.
--
-- Non fa: nessuna chiave HMAC, nessun secret, nessuno pseudonimo,
-- nessuna vista per utente o per chiamata, nessuna modifica alle
-- edge function, nessun UPDATE delle righe già presenti.
--
-- Le righe già in tabella non vengono riscritte. L'UUID che alcune
-- portano resta dov'è fino alla cancellazione dei 90 giorni e non
-- compare in alcuna vista. Un UPDATE di massa degli UUID non è
-- autorizzato.
--
-- Applicare nell'SQL editor di Lovable Cloud, dopo le migrazioni che
-- creano public.ai_usage. Un solo file, in questo ordine. Si può
-- rieseguire: colonne, vincoli, viste, funzione e job sono idempotenti.
--
-- ----------------------------------------------------------------------
-- Regola k (fase anonima)
-- ----------------------------------------------------------------------
-- Grano delle celle pubblicate:
--   · v_cfo_ai_usage_daily
--       giorno di calendario Europe/Rome × feature × provider × model
--       × segmento
--   · v_cfo_ai_usage_weekly_segment
--       settimana ISO (lunedì, Europe/Rome) × segmento
--   · v_cfo_contatori
--       feature × provider × model × segmento, su tutte le righe
--       ancora dentro la retention. Media, P50 e P90 sono sulla
--       distribuzione delle chiamate, non degli utenti: senza id
--       non esistono percentili per utente, né DAU, né MAU.
--
-- Una cella si pubblica solo se ha almeno 10 eventi (righe).
-- Se nella cella c'è almeno un user_id non nullo (dato preesistente),
-- serve anche che quegli utenti distinti siano almeno 10. Se tutti
-- gli user_id sono nulli, la soglia sugli utenti non si applica:
-- non si inventa un conteggio di persone che non sono state registrate.
-- Una cella mista (anche un solo UUID insieme a righe anonime) resta
-- nascosta finché gli UUID distinti non sono almeno 10.
--
-- Il conteggio degli utenti è interno alla vista. Non è una colonna.
-- Le viste non hanno user_id, hash, coorte, IP, user agent, sessione
-- o dispositivo. L'unica lettura è su public.ai_usage: niente join
-- verso auth, profili, abbonamenti, sessioni, storage o log.
--
-- piano_nome in uscita è valorizzato solo se, insieme:
--   1. il segmento ha almeno 10 user_id distinti non nulli;
--   2. la cella ha un solo piano_nome non nullo;
--   3. quel nome è presente su almeno 10 eventi della cella.
-- Altrimenti la colonna è NULL e resta solo il segmento
-- (free / prova / pagante / beta). In questa fase il logger non
-- può contare gli utenti, quindi il nome non arriva al CFO.
--
-- ----------------------------------------------------------------------
-- Contratto del logger (PR 2 — non implementato qui)
-- ----------------------------------------------------------------------
-- logAiUsage() deve:
--   · scartare qualunque user id o pseudonimo, anche se il chiamante
--     lo passa, e scrivere user_id NULL. Non leggere né creare la
--     chiave HMAC chiamata AI_USAGE_USER_HASH_SALT. Il flag di identificazione
--     resta spento: se è spento il codice non legge quel secret.
--   · non scrivere IP, user agent, id di sessione, id di dispositivo,
--     coorte, scuola, classe, nome, email, prompt, risposta, percorso
--     di file o corpo di errore del fornitore.
--   · non aggiungere colonne di testo libero. feature, segmento, esito
--     e piano_nome accettano solo gli elenchi dei CHECK qui sotto.
--   · non fare join né chiavi esterne verso auth.users, log applicativi,
--     sessioni, storage o subscriptions per arricchire la riga.
--   · lasciare created_at vuoto, oppure accettare che il trigger lo
--     tronchi all'ora UTC. Non esiste un orario preciso.
--   · scrivere piano_nome NULL. Il nome del piano si può salvare solo
--     quando il segmento ha già almeno 10 utenti distinti. In fase
--     anonima quel conteggio non esiste (user_id è NULL), quindi il
--     logger non deve inventarlo né copiarlo da Paddle. Il trigger
--     ai_usage_guard_piano_nome azzera il nome sulla riga grezza se la
--     soglia non c'è. La vista è la seconda rete: anche un valore
--     rimasto in tabella resta NULL verso il CFO se la cella non ha
--     un solo nome su almeno 10 eventi.
--   · segmento solo free | prova | pagante | beta (prova = trialing;
--     beta non è pagante).
--
-- ----------------------------------------------------------------------
-- Retention
-- ----------------------------------------------------------------------
-- public.purge_ai_cost_rows_older_than_90_days() cancella da ai_usage
-- le righe con created_at < now() - 90 giorni. I listini non si
-- toccano: non sono dati di persona e servono a riprezzare.
-- In fondo al file la funzione viene eseguita una volta, così
-- l'applicazione della migrazione è già il go-live della retention.
-- Se lo schema cron esiste e cron.schedule è chiamabile, il job
-- purge-ai-cost-rows-90d parte ogni ora al minuto 17. Lo scarto
-- massimo oltre i 90 giorni è circa un'ora.
-- Se pg_cron non c'è, la migrazione non fallisce. Alternativa, da
-- attivare comunque al go-live: una chiamata schedulata con la
-- service role (non con il ruolo del CFO)
--   SELECT public.purge_ai_cost_rows_older_than_90_days();
-- oppure, dopo aver abilitato l'estensione dal pannello:
--   SELECT cron.schedule(
--     'purge-ai-cost-rows-90d',
--     '17 * * * *',
--     'SELECT public.purge_ai_cost_rows_older_than_90_days()'
--   );
-- Non si crea qui un'edge function: è fuori perimetro.

-- ── Ruoli ──────────────────────────────────────────────────────────────
-- Su Lovable Cloud anon, authenticated e service_role esistono già:
-- non vengono modificati. cfo_readonly nasce senza login e senza
-- password. La password, se il pannello consente il login diretto,
-- si imposta fuori dal repository.

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
  'Lettura dei soli aggregati di costo AI con soglia k >= 10. Nessun login finché la password non è impostata fuori dal repository. Nessun accesso a ai_usage, ai_price_lists, auth, profili, sessioni o storage.';

-- ── Colonne anonime su ai_usage ────────────────────────────────────────
-- Nullable: il logger già in produzione non le invia e non deve
-- rompersi. I CHECK accettano NULL e rifiutano qualunque testo fuori
-- elenco. fn, provider e model restano come sono: un CHECK su fn
-- rifiuterebbe i tag che il logger attuale scrive già.

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

-- Elenco chiuso dei nomi piano noti (price id attuale + etichette CFO).
-- Un nome commerciale nuovo richiede una migrazione, non testo libero.
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
  'Istante troncato all''ora UTC (trigger ai_usage_truncate_created_at). Le righe scritte prima di questa migrazione possono avere ancora i minuti: non vengono riscritte e escono dalle viste solo come giorno o settimana. La retention le cancella entro 90 giorni.';

COMMENT ON COLUMN public.ai_usage.piano_nome IS
  'Nome piano a elenco chiuso. Il logger della PR 2, in fase anonima, scrive NULL. Le viste CFO lo mostrano solo se il segmento ha almeno 10 utenti distinti e la cella ha un solo nome su almeno 10 eventi.';

COMMENT ON COLUMN public.ai_usage.user_id IS
  'Colonna preesistente. La fase anonima non la espone e il logger della PR 2 deve scriverla NULL. Nessun hash, nessuna chiave esterna verso auth.users.';

COMMENT ON TABLE public.ai_usage IS
  'Registro tecnico delle chiamate AI. Fase anonima: niente IP, user agent, sessione, dispositivo, coorte o pseudonimo. Orario all''ora. Retention massima 90 giorni. Vietato incrociare queste righe con log applicativi, sessioni o auth.';

-- ── Orario all'ora, in UTC, indipendente dal TimeZone di sessione ─────

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

-- Chi inserisce deve poter eseguire la funzione del trigger.
-- Il CFO e i ruoli del client no.
REVOKE ALL ON FUNCTION public.ai_usage_truncate_created_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_usage_truncate_created_at() FROM anon, authenticated, cfo_readonly;
GRANT EXECUTE ON FUNCTION public.ai_usage_truncate_created_at() TO service_role;

-- Nome del piano sulla riga grezza solo se il segmento ha già
-- almeno 10 utenti distinti. Senza user_id (fase anonima) il nome
-- viene sempre azzerato. Non è un UPDATE delle righe già presenti:
-- vale solo per le scritture nuove.
CREATE OR REPLACE FUNCTION public.ai_usage_guard_piano_nome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  known_users bigint;
BEGIN
  IF NEW.piano_nome IS NULL OR NEW.segmento IS NULL OR NEW.user_id IS NULL THEN
    NEW.piano_nome := NULL;
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT user_id)
    INTO known_users
  FROM public.ai_usage
  WHERE segmento = NEW.segmento
    AND user_id IS NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ai_usage
    WHERE segmento = NEW.segmento
      AND user_id = NEW.user_id
  ) THEN
    known_users := known_users + 1;
  END IF;

  IF known_users < 10 THEN
    NEW.piano_nome := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ai_usage_guard_piano_nome ON public.ai_usage;
CREATE TRIGGER ai_usage_guard_piano_nome
  BEFORE INSERT OR UPDATE OF piano_nome, segmento, user_id ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_usage_guard_piano_nome();

REVOKE ALL ON FUNCTION public.ai_usage_guard_piano_nome() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_usage_guard_piano_nome() FROM anon, authenticated, cfo_readonly;
GRANT EXECUTE ON FUNCTION public.ai_usage_guard_piano_nome() TO service_role;

CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx
  ON public.ai_usage (created_at);

CREATE INDEX IF NOT EXISTS ai_usage_feature_created_idx
  ON public.ai_usage (feature, created_at);

-- ── Listini versionati ─────────────────────────────────────────────────
-- Catalogo interno per la STIMA. Nessun dato di studente. Non entra
-- nella retention dei 90 giorni. Il CFO non ha SELECT: nelle viste
-- compare solo l'identificativo di versione, quando nella cella è uno.

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
  'Listino macchina per la STIMA di costo. Nessun dato personale, nessuna retention a 90 giorni, nessun accesso al CFO. Non ha chiavi esterne verso auth, sessioni o log.';

-- ── RLS: il client non legge e non scrive ─────────────────────────────

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_price_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_insert_authenticated" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_insert_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_select_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_update_service_role" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_delete_service_role" ON public.ai_usage;

CREATE POLICY "ai_usage_select_service_role" ON public.ai_usage
  FOR SELECT TO service_role USING (true);
CREATE POLICY "ai_usage_insert_service_role" ON public.ai_usage
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ai_usage_update_service_role" ON public.ai_usage
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ai_usage_delete_service_role" ON public.ai_usage
  FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "ai_price_lists_all_service_role" ON public.ai_price_lists;
CREATE POLICY "ai_price_lists_all_service_role" ON public.ai_price_lists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.ai_usage FROM PUBLIC, anon, authenticated, cfo_readonly;
REVOKE ALL ON TABLE public.ai_price_lists FROM PUBLIC, anon, authenticated, cfo_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_price_lists TO service_role;

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

-- ── Cancellazione oltre 90 giorni ──────────────────────────────────────

DROP FUNCTION IF EXISTS public.purge_ai_cost_rows_older_than_90_days();

CREATE FUNCTION public.purge_ai_cost_rows_older_than_90_days()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  deleted_usage bigint;
BEGIN
  DELETE FROM public.ai_usage
  WHERE created_at < pg_catalog.now() - interval '90 days';
  GET DIAGNOSTICS deleted_usage = ROW_COUNT;
  RETURN deleted_usage;
END;
$fn$;

COMMENT ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() IS
  'Cancella le righe di ai_usage più vecchie di 90 giorni. Non tocca ai_price_lists. Da eseguire al go-live e poi ogni ora. Il ruolo cfo_readonly non può chiamarla.';

REVOKE ALL ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() FROM anon, authenticated, cfo_readonly;
GRANT EXECUTE ON FUNCTION public.purge_ai_cost_rows_older_than_90_days() TO service_role;

-- ── Viste CFO ──────────────────────────────────────────────────────────
-- security_barrier e privilegi del proprietario (security_invoker
-- spento, che è il default): il CFO legge la vista senza SELECT sulla
-- tabella. Non impostare security_invoker = true.

DROP VIEW IF EXISTS public.v_cfo_contatori;
DROP VIEW IF EXISTS public.v_cfo_ai_usage_weekly_segment;
DROP VIEW IF EXISTS public.v_cfo_ai_usage_daily;

CREATE VIEW public.v_cfo_ai_usage_daily
WITH (security_barrier = true) AS
SELECT
  (u.created_at AT TIME ZONE 'Europe/Rome')::date AS giorno,
  u.feature,
  u.provider,
  u.model,
  u.segmento,
  CASE
    WHEN COALESCE(max(seg.n_utenti), 0) >= 10
     AND count(DISTINCT u.piano_nome) FILTER (WHERE u.piano_nome IS NOT NULL) = 1
     AND count(u.piano_nome) >= 10
    THEN min(u.piano_nome)
    ELSE NULL
  END AS piano_nome,
  count(*)::bigint AS n_eventi,
  count(*) FILTER (
    WHERE u.esito = 'retry' OR (u.esito IS NULL AND COALESCE(u.is_retry, false))
  )::bigint AS n_retry,
  count(*) FILTER (
    WHERE u.esito = 'ok'
       OR (u.esito IS NULL AND u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_ok,
  count(*) FILTER (
    WHERE u.esito = 'fallita'
       OR (u.esito IS NULL AND NOT u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_fallita,
  COALESCE(sum(u.prompt_tokens), 0)::bigint AS prompt_tokens,
  COALESCE(sum(u.cached_prompt_tokens), 0)::bigint AS cached_prompt_tokens,
  COALESCE(sum(u.completion_tokens), 0)::bigint AS completion_tokens,
  COALESCE(sum(u.reasoning_tokens), 0)::bigint AS reasoning_tokens,
  COALESCE(sum(u.estimated_cost_eur), 0)::numeric(18, 6) AS estimated_cost_eur,
  COALESCE(sum(u.image_count), 0)::bigint AS image_count,
  COALESCE(sum(u.page_count), 0)::bigint AS page_count,
  COALESCE(sum(u.audio_characters), 0)::bigint AS audio_characters,
  COALESCE(sum(u.audio_seconds), 0)::numeric(14, 3) AS audio_seconds,
  CASE
    WHEN count(DISTINCT u.price_list_version) FILTER (WHERE u.price_list_version IS NOT NULL) = 1
    THEN min(u.price_list_version)
    ELSE NULL
  END AS price_list_version
FROM public.ai_usage u
LEFT JOIN (
  SELECT segmento, count(DISTINCT user_id)::bigint AS n_utenti
  FROM public.ai_usage
  WHERE user_id IS NOT NULL AND segmento IS NOT NULL
  GROUP BY segmento
) seg ON seg.segmento = u.segmento
GROUP BY 1, 2, 3, 4, 5
HAVING count(*) >= 10
   AND (
     count(u.user_id) = 0
     OR count(DISTINCT u.user_id) >= 10
   );

COMMENT ON VIEW public.v_cfo_ai_usage_daily IS
  'Aggregato giorno × feature × provider × model × segmento. Celle sotto 10 eventi, o sotto 10 utenti distinti se c''è un user_id, omesse. piano_nome solo con segmento di almeno 10 utenti. Nessun id.';

CREATE VIEW public.v_cfo_ai_usage_weekly_segment
WITH (security_barrier = true) AS
SELECT
  date_trunc('week', u.created_at AT TIME ZONE 'Europe/Rome')::date AS settimana,
  u.segmento,
  CASE
    WHEN COALESCE(max(seg.n_utenti), 0) >= 10
     AND count(DISTINCT u.piano_nome) FILTER (WHERE u.piano_nome IS NOT NULL) = 1
     AND count(u.piano_nome) >= 10
    THEN min(u.piano_nome)
    ELSE NULL
  END AS piano_nome,
  count(*)::bigint AS n_eventi,
  count(*) FILTER (
    WHERE u.esito = 'retry' OR (u.esito IS NULL AND COALESCE(u.is_retry, false))
  )::bigint AS n_retry,
  count(*) FILTER (
    WHERE u.esito = 'ok'
       OR (u.esito IS NULL AND u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_ok,
  count(*) FILTER (
    WHERE u.esito = 'fallita'
       OR (u.esito IS NULL AND NOT u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_fallita,
  COALESCE(sum(u.prompt_tokens), 0)::bigint AS prompt_tokens,
  COALESCE(sum(u.cached_prompt_tokens), 0)::bigint AS cached_prompt_tokens,
  COALESCE(sum(u.completion_tokens), 0)::bigint AS completion_tokens,
  COALESCE(sum(u.reasoning_tokens), 0)::bigint AS reasoning_tokens,
  COALESCE(sum(u.estimated_cost_eur), 0)::numeric(18, 6) AS estimated_cost_eur,
  COALESCE(sum(u.image_count), 0)::bigint AS image_count,
  COALESCE(sum(u.page_count), 0)::bigint AS page_count,
  COALESCE(sum(u.audio_characters), 0)::bigint AS audio_characters,
  COALESCE(sum(u.audio_seconds), 0)::numeric(14, 3) AS audio_seconds
FROM public.ai_usage u
LEFT JOIN (
  SELECT segmento, count(DISTINCT user_id)::bigint AS n_utenti
  FROM public.ai_usage
  WHERE user_id IS NOT NULL AND segmento IS NOT NULL
  GROUP BY segmento
) seg ON seg.segmento = u.segmento
GROUP BY 1, 2
HAVING count(*) >= 10
   AND (
     count(u.user_id) = 0
     OR count(DISTINCT u.user_id) >= 10
   );

COMMENT ON VIEW public.v_cfo_ai_usage_weekly_segment IS
  'Aggregato settimana × segmento, soglia k >= 10, senza hash e senza user_id. piano_nome solo se il segmento ha almeno 10 utenti distinti.';

CREATE VIEW public.v_cfo_contatori
WITH (security_barrier = true) AS
SELECT
  u.feature,
  u.provider,
  u.model,
  u.segmento,
  CASE
    WHEN COALESCE(max(seg.n_utenti), 0) >= 10
     AND count(DISTINCT u.piano_nome) FILTER (WHERE u.piano_nome IS NOT NULL) = 1
     AND count(u.piano_nome) >= 10
    THEN min(u.piano_nome)
    ELSE NULL
  END AS piano_nome,
  count(*)::bigint AS n_eventi,
  avg(u.prompt_tokens)::numeric(18, 2) AS prompt_tokens_avg,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY u.prompt_tokens)::numeric(18, 2) AS prompt_tokens_p50,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY u.prompt_tokens)::numeric(18, 2) AS prompt_tokens_p90,
  avg(u.cached_prompt_tokens)::numeric(18, 2) AS cached_prompt_tokens_avg,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY u.cached_prompt_tokens)::numeric(18, 2) AS cached_prompt_tokens_p50,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY u.cached_prompt_tokens)::numeric(18, 2) AS cached_prompt_tokens_p90,
  avg(u.completion_tokens)::numeric(18, 2) AS completion_tokens_avg,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY u.completion_tokens)::numeric(18, 2) AS completion_tokens_p50,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY u.completion_tokens)::numeric(18, 2) AS completion_tokens_p90,
  COALESCE(sum(u.estimated_cost_eur), 0)::numeric(18, 6) AS estimated_cost_eur_sum,
  avg(u.estimated_cost_eur)::numeric(18, 6) AS estimated_cost_eur_avg,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY u.estimated_cost_eur)::numeric(18, 6) AS estimated_cost_eur_p50,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY u.estimated_cost_eur)::numeric(18, 6) AS estimated_cost_eur_p90,
  count(*) FILTER (
    WHERE u.esito = 'retry' OR (u.esito IS NULL AND COALESCE(u.is_retry, false))
  )::bigint AS n_retry,
  count(*) FILTER (
    WHERE u.esito = 'ok'
       OR (u.esito IS NULL AND u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_ok,
  count(*) FILTER (
    WHERE u.esito = 'fallita'
       OR (u.esito IS NULL AND NOT u.ok AND NOT COALESCE(u.is_retry, false))
  )::bigint AS n_fallita
FROM public.ai_usage u
LEFT JOIN (
  SELECT segmento, count(DISTINCT user_id)::bigint AS n_utenti
  FROM public.ai_usage
  WHERE user_id IS NOT NULL AND segmento IS NOT NULL
  GROUP BY segmento
) seg ON seg.segmento = u.segmento
GROUP BY 1, 2, 3, 4
HAVING count(*) >= 10
   AND (
     count(u.user_id) = 0
     OR count(DISTINCT u.user_id) >= 10
   );

COMMENT ON VIEW public.v_cfo_contatori IS
  'Media, P50 e P90 per chiamata (non per utente) su feature × provider × model × segmento, soglia k >= 10. Senza DAU, MAU e senza id. I totali vivono quanto le righe grezze: questa PR non archivia aggregati oltre i 90 giorni.';

REVOKE ALL ON TABLE public.v_cfo_ai_usage_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v_cfo_ai_usage_weekly_segment FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v_cfo_contatori FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO cfo_readonly;
GRANT SELECT ON TABLE public.v_cfo_ai_usage_daily TO cfo_readonly, service_role;
GRANT SELECT ON TABLE public.v_cfo_ai_usage_weekly_segment TO cfo_readonly, service_role;
GRANT SELECT ON TABLE public.v_cfo_contatori TO cfo_readonly, service_role;

-- Non esistono, e non vanno create in questa fase:
-- viste per utente hashato e viste del dettaglio chiamata.

-- ── Pianificazione, se pg_cron è già presente ──────────────────────────

DO $cron$
BEGIN
  IF to_regnamespace('cron') IS NULL
     OR to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE NOTICE 'pg_cron non disponibile: purge_ai_cost_rows_older_than_90_days() è creata ed eseguita una volta, ma non è stata schedulata. Alternativa al go-live: abilitare pg_cron e lanciare cron.schedule, oppure chiamare la funzione ogni ora con la service role. Vedi il commento in testa al file.';
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
  RAISE NOTICE 'pg_cron presente ma la pianificazione non è riuscita (%). La funzione resta creata. Pianificarla dal pannello con il comando nel commento in testa al file.', SQLERRM;
END
$cron$;

-- Go-live della retention: cancella subito ciò che è già oltre i 90 giorni.
SELECT public.purge_ai_cost_rows_older_than_90_days();
