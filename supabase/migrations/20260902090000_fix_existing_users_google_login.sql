-- ============================================================================
-- Migration: Fix "existing Google users are treated as new users"
-- Data: 2026-09-02
--
-- PROBLEMA
-- 1) La colonna `user_profiles.has_completed_onboarding` (aggiunta il
--    2026-06-14) nasce con default FALSE e non è mai stata retro-compilata:
--    gli utenti con un profilo cognitivo esistente ma flag FALSE ripartivano
--    dall'onboarding.
-- 2) In passato alcune righe sono state salvate con `user_id` = EMAIL al
--    posto dell'UUID di auth.uid() (vedi commento "legacy user_id" nella
--    migration 20260502090551). Quelle righe non vengono trovate dalle query
--    per auth.uid() → dati "vuoti".
--
-- COSA FA (idempotente, nessuna cancellazione, nessun dato perso)
--   a. Segna come completato l'onboarding per i profili che hanno già una
--      riga in `cognitive_profiles`.
--   b. Crea la riga `user_profiles` mancante per chi ha un profilo cognitivo
--      (ON CONFLICT DO NOTHING: mai duplicati).
--   c. Collega le righe legacy con `user_id` = email all'UUID dell'utente
--      (auth.users.email è univoco): le righe diventano visibili e restano
--      sui dati esistenti. Se un conflitto di unicità impedisce il
--      collegamento, la riga viene LASCIATA INTATTA (nessuna perdita) e
--      viene emesso un NOTICE per la revisione manuale.
--   d. Ri-afferma (se mancanti) le policy RLS di proprietà su
--      `user_profiles`, `user_data`, `cognitive_profiles`.
--
-- APPLICAZIONE: tramite Lovable Cloud (Update / SQL editor su Supabase),
-- come da regole di progetto. Non eseguire direttamente.
-- ROLLBACK: nessuna riga viene cancellata; per revertire i collegamenti
-- (c / b) non è necessario: sono aggiornamenti di sola id estensione.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- a) Backfill: chi ha un profilo cognitivo ha completato l'onboarding
-- ---------------------------------------------------------------------------
UPDATE public.user_profiles p
SET has_completed_onboarding = true,
    updated_at = now()
WHERE p.has_completed_onboarding = false
  AND EXISTS (
    SELECT 1 FROM public.cognitive_profiles c
    WHERE c.user_id = p.user_id
  );

-- ---------------------------------------------------------------------------
-- b) Profilo utente mancante ma profilo cognitivo presente → crea solo se
--    assente (mai duplicati grazie a ON CONFLICT (user_id) DO NOTHING).
-- ---------------------------------------------------------------------------
INSERT INTO public.user_profiles (user_id, institute_type, subject_levels, has_completed_onboarding)
SELECT c.user_id, 'liceo_scientifico', '{}'::jsonb, true
FROM public.cognitive_profiles c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.user_id = c.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- c) Collega righe legacy salvate sotto EMAIL all'UUID corrente.
--    Confronto case-insensitive, solo se la riga canonica (UUID) non esiste.
--    Ogni tabella è isolata: un conflitto non blocca il resto della migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'study_contexts', 'study_events', 'mini_lessons', 'lesson_progress',
    'user_data', 'user_profiles', 'subscriptions', 'chat_conversations',
    'lesson_figures', 'cognitive_profiles', 'evaluations', 'exercise_jobs',
    'quiz_results', 'push_subscriptions', 'study_sessions_logs',
    'user_routines', 'user_subjects'
  ] LOOP
    BEGIN
      EXECUTE format(
        $sql$
        UPDATE public.%I t
        SET user_id = u.id::text
        FROM auth.users u
        WHERE lower(btrim(t.user_id)) = lower(u.email)
          AND t.user_id <> u.id::text
          AND NOT EXISTS (
            SELECT 1 FROM public.%I x WHERE x.user_id = u.id::text
          )
        $sql$,
        table_name, table_name
      );
      RAISE NOTICE 'backfill %: collegamento legacy -> uuid completato', table_name;
    EXCEPTION WHEN unique_violation THEN
      -- Es. due righe legacy con lo stesso contenuto per lo stesso utente:
      -- nessun dato viene toccato, la riga in conflitto resta per revisione.
      RAISE NOTICE 'backfill %: SALTA righe in conflitto (%); nessun dato perso',
        table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- d) Policy RLS di proprietà: create solo se MANCANTI (mai sovrascritte).
--    Semantica: l'utente può vedere/modificare solo le proprie righe
--    (user_id = auth.uid()).
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can view their own data"
  ON public.user_data FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can insert their own data"
  ON public.user_data FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can update their own data"
  ON public.user_data FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can view own cognitive profile"
  ON public.cognitive_profiles FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can insert own cognitive profile"
  ON public.cognitive_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY IF NOT EXISTS "Users can update own cognitive profile"
  ON public.cognitive_profiles FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Verifica finale (sola lettura): quanti utenti hanno un profilo cognitivo
-- ma risultano ancora "senza onboarding" (atteso: 0 dopo la migration).
-- ---------------------------------------------------------------------------
-- SELECT count(*) AS ancora_senza_flag
-- FROM public.user_profiles p
-- WHERE p.has_completed_onboarding = false
--   AND EXISTS (SELECT 1 FROM public.cognitive_profiles c WHERE c.user_id = p.user_id);
