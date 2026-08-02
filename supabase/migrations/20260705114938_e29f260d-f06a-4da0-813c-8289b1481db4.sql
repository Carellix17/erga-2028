
-- user_subjects: materie predefinite dell'utente
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subjects TO authenticated;
GRANT ALL ON public.user_subjects TO service_role;

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subjects"
  ON public.user_subjects FOR ALL
  USING ((auth.uid())::text = user_id)
  WITH CHECK ((auth.uid())::text = user_id);

CREATE TRIGGER user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_routines: blocchi di routine giornaliera
CREATE TABLE IF NOT EXISTS public.user_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('school','sleep','meal','other')),
  label TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_routines TO authenticated;
GRANT ALL ON public.user_routines TO service_role;

ALTER TABLE public.user_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routines"
  ON public.user_routines FOR ALL
  USING ((auth.uid())::text = user_id)
  WITH CHECK ((auth.uid())::text = user_id);

CREATE TRIGGER user_routines_updated_at
  BEFORE UPDATE ON public.user_routines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON public.user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routines_user ON public.user_routines(user_id);
