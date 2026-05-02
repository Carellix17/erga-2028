-- 1) Contatore di generazioni nel profilo utente
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS generation_count integer NOT NULL DEFAULT 0;

-- 2) Flag "demo" sui contesti di studio (PDF / corsi)
ALTER TABLE public.study_contexts
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_study_contexts_is_demo
  ON public.study_contexts (is_demo) WHERE is_demo = true;

-- 3) Permetti a TUTTI gli utenti autenticati di leggere i contesti demo
DROP POLICY IF EXISTS "Anyone can view demo study contexts" ON public.study_contexts;
CREATE POLICY "Anyone can view demo study contexts"
  ON public.study_contexts
  FOR SELECT
  TO authenticated
  USING (is_demo = true);

-- 4) Permetti a TUTTI gli utenti autenticati di leggere le lezioni
--    appartenenti ai contesti demo
DROP POLICY IF EXISTS "Anyone can view lessons of demo contexts" ON public.mini_lessons;
CREATE POLICY "Anyone can view lessons of demo contexts"
  ON public.mini_lessons
  FOR SELECT
  TO authenticated
  USING (
    context_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.study_contexts sc
      WHERE sc.id = public.mini_lessons.context_id
        AND sc.is_demo = true
    )
  );

-- 5) Idem per lesson_figures (le figure delle lezioni demo)
DROP POLICY IF EXISTS "Anyone can view figures of demo contexts" ON public.lesson_figures;
CREATE POLICY "Anyone can view figures of demo contexts"
  ON public.lesson_figures
  FOR SELECT
  TO authenticated
  USING (
    context_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.study_contexts sc
      WHERE sc.id = public.lesson_figures.context_id
        AND sc.is_demo = true
    )
  );

-- 6) Marca come demo TUTTI i contesti dell'account admin (alecare2025@gmail.com).
--    Lookup via auth.users per ottenere lo UUID corrispondente.
UPDATE public.study_contexts sc
SET is_demo = true
WHERE sc.user_id IN (
  SELECT u.id::text FROM auth.users u WHERE u.email = 'alecare2025@gmail.com'
)
OR sc.user_id = 'alecare2025@gmail.com'; -- fallback per eventuale legacy user_id

-- 7) Helper SECURITY DEFINER per controllare se un user è admin/demo-owner.
--    Restituisce true SOLO per l'account specificato.
CREATE OR REPLACE FUNCTION public.is_demo_admin(_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id::text = _user_id AND u.email = 'alecare2025@gmail.com'
  );
$$;