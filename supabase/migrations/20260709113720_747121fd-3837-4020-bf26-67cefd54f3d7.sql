
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.user_subjects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('orale','scritta','pratica','interrogazione','compito')),
  title text NOT NULL,
  description text,
  date timestamptz NOT NULL,
  topic_type text NOT NULL DEFAULT 'free' CHECK (topic_type IN ('linked','free')),
  topic_id uuid REFERENCES public.mini_lessons(id) ON DELETE SET NULL,
  free_topic_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own evaluations"
  ON public.evaluations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS evaluations_user_date_idx ON public.evaluations(user_id, date);

CREATE TRIGGER evaluations_set_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
