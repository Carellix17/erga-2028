
-- 1) Estendi study_contexts con stato di generazione del percorso
ALTER TABLE public.study_contexts
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS generation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS generation_error text;

CREATE INDEX IF NOT EXISTS idx_study_contexts_user_generation_status
  ON public.study_contexts (user_id, generation_status);

-- 2) Job di generazione esercizi (background)
CREATE TABLE IF NOT EXISTS public.exercise_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  context_id uuid,
  lesson_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'generating',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_jobs_user_status
  ON public.exercise_jobs (user_id, status, created_at DESC);

ALTER TABLE public.exercise_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exercise jobs" ON public.exercise_jobs;
CREATE POLICY "Users can view own exercise jobs"
  ON public.exercise_jobs FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can insert own exercise jobs" ON public.exercise_jobs;
CREATE POLICY "Users can insert own exercise jobs"
  ON public.exercise_jobs FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own exercise jobs" ON public.exercise_jobs;
CREATE POLICY "Users can update own exercise jobs"
  ON public.exercise_jobs FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own exercise jobs" ON public.exercise_jobs;
CREATE POLICY "Users can delete own exercise jobs"
  ON public.exercise_jobs FOR DELETE TO authenticated
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Service role manages exercise jobs" ON public.exercise_jobs;
CREATE POLICY "Service role manages exercise jobs"
  ON public.exercise_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_exercise_jobs_updated_at ON public.exercise_jobs;
CREATE TRIGGER trg_exercise_jobs_updated_at
  BEFORE UPDATE ON public.exercise_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Realtime per ripristinare UX al rientro
ALTER TABLE public.study_contexts REPLICA IDENTITY FULL;
ALTER TABLE public.exercise_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'study_contexts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.study_contexts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exercise_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_jobs';
  END IF;
END $$;
