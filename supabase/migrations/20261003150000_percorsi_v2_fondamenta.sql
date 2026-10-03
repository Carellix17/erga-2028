-- 🧭 PERCORSI 2.0 — PACCHETTO 1: FONDAMENTA (l'infrastruttura, non il motore).
--
-- Cosa aggiunge (tutto additive, zero impatto sui percorsi esistenti):
--   1. IL PASSAPORTO DEI PERCORSI (study_contexts):
--      · path_version: 1 = percorsi attuali (tutti quelli esistenti partono
--        da 1 e restano tali), 2 = percorsi generati dal futuro motore per
--        materia. Il client lo leggerà per scegliere il lettore giusto.
--      · subject_family / subject: la famiglia didattica riconosciuta dal
--        futuro "rilevatore" (scientifiche, letteratura, storiche, filosofia,
--        lingue, latino, sociali, informatica, arte) e la materia specifica.
--        NULL = non ancora rilevata (tutti i percorsi esistenti).
--   2. IL REGISTRO DEI COSTI ONESTO (ai_usage):
--      · prompt_tokens / completion_tokens / total_tokens / duration_ms per
--        ogni chiamata AI riuscita. Serve a sapere quanto costa davvero un
--        percorso (base per il futuro piano Pro). Nessuna riga esistente
--        cambia: le nuove colonne partono a NULL.
--
-- Sicurezza: nessun nuovo accesso; le nuove colonne sono scrivibili solo
-- dal service_role (edge functions), che già ha GRANT su queste tabelle.

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
