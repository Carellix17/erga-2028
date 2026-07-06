
CREATE TABLE IF NOT EXISTS public.study_sessions_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  subject_id uuid REFERENCES public.user_subjects(id) ON DELETE SET NULL,
  subject_name text,
  task_label text,
  event_id uuid REFERENCES public.study_events(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('planned','adhoc')),
  estimated_duration integer,
  actual_duration integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions_logs TO authenticated;
GRANT ALL ON public.study_sessions_logs TO service_role;

ALTER TABLE public.study_sessions_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session logs"
  ON public.study_sessions_logs FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert their own session logs"
  ON public.study_sessions_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own session logs"
  ON public.study_sessions_logs FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own session logs"
  ON public.study_sessions_logs FOR DELETE TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE INDEX IF NOT EXISTS idx_study_sessions_logs_user_completed
  ON public.study_sessions_logs (user_id, completed_at DESC);
