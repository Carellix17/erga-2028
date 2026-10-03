-- ── 1. Passaporto dei percorsi ─────────────────────────────────────────────
ALTER TABLE public.study_contexts
  ADD COLUMN IF NOT EXISTS path_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subject_family text,
  ADD COLUMN IF NOT EXISTS subject text;

-- Solo i percorsi v2 (quando esisteranno) frutteranno una famiglia:
-- niente backfill inventato per quelli esistenti.

-- ── 2. Registro dei costi ───────────────────────────────────────────────────
ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS completion_tokens integer,
  ADD COLUMN IF NOT EXISTS total_tokens integer,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

-- Indice per il calcolo dei costi per funzione nel tempo ("quanto costa
-- generare le lezioni?"): accanto a quello esistente per utente.
CREATE INDEX IF NOT EXISTS ai_usage_fn_created_idx
  ON public.ai_usage (fn, created_at DESC);