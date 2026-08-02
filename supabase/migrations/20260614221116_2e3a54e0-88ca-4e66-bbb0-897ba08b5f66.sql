
CREATE TABLE public.cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  nome TEXT,
  eta INTEGER,
  istituto TEXT,
  log_score INTEGER NOT NULL DEFAULT 50,
  mem_score INTEGER NOT NULL DEFAULT 50,
  foc_score INTEGER NOT NULL DEFAULT 50,
  voc_score INTEGER NOT NULL DEFAULT 50,
  ans_score INTEGER NOT NULL DEFAULT 50,
  app_score INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cognitive_profiles TO authenticated;
GRANT ALL ON public.cognitive_profiles TO service_role;

ALTER TABLE public.cognitive_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cognitive profile"
  ON public.cognitive_profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own cognitive profile"
  ON public.cognitive_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own cognitive profile"
  ON public.cognitive_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own cognitive profile"
  ON public.cognitive_profiles FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE TRIGGER set_cognitive_profiles_updated_at
  BEFORE UPDATE ON public.cognitive_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN NOT NULL DEFAULT false;
