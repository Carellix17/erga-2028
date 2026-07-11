-- Rimuove policy permissive che esponevano i contesti/lezioni/figure marcati is_demo a tutti gli utenti autenticati.
-- Le uniche letture consentite tornano ad essere quelle basate su auth.uid() = user_id.
DROP POLICY IF EXISTS "Anyone can view demo study contexts" ON public.study_contexts;
DROP POLICY IF EXISTS "Anyone can view lessons of demo contexts" ON public.mini_lessons;
DROP POLICY IF EXISTS "Anyone can view figures of demo contexts" ON public.lesson_figures;