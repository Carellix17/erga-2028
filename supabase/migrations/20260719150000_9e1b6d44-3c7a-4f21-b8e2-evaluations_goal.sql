-- ============================================================
-- Obiettivo di voto per singola verifica/compito
-- ------------------------------------------------------------
-- Ogni scadenza (tabella evaluations) puo' avere un voto che
-- lo studente vuole ottenere. Il piano AI lo usa, insieme al
-- livello attuale della materia e al profilo cognitivo, per
-- dare piu' preparazione dove il divario e' alto.
-- La tabella ha gia' i permessi GRANT su 'authenticated':
-- la nuova colonna li eredita automaticamente (i GRANT sono
-- a livello tabella, non colonna).
-- ============================================================

-- 1) Nuova colonna (opzionale: puo' restare vuota)
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS goal smallint;

COMMENT ON COLUMN public.evaluations.goal IS
  'Voto obiettivo della verifica/compito (1-10, opzionale). Guida la priorita del piano AI.';

-- 2) Guardia: solo valori sensati (1-10) o vuoto.
--    I vincoli non supportano IF NOT EXISTS: controllo prima sul catalogo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluations_goal_range'
  ) THEN
    ALTER TABLE public.evaluations
      ADD CONSTRAINT evaluations_goal_range
      CHECK (goal IS NULL OR (goal BETWEEN 1 AND 10));
  END IF;
END $$;
