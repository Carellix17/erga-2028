-- Cache table for AI-extracted figure crops per lesson
CREATE TABLE public.lesson_figures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.mini_lessons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  context_id UUID REFERENCES public.study_contexts(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  figure_index INTEGER NOT NULL DEFAULT 0,
  bbox JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_figures_lesson ON public.lesson_figures(lesson_id);
CREATE INDEX idx_lesson_figures_user ON public.lesson_figures(user_id);

ALTER TABLE public.lesson_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson figures"
  ON public.lesson_figures FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert own lesson figures"
  ON public.lesson_figures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete own lesson figures"
  ON public.lesson_figures FOR DELETE
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Service role manages lesson figures"
  ON public.lesson_figures FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Storage policies for figure crops in study-pdfs bucket (lesson-figures/ prefix)
CREATE POLICY "Public can read lesson figure crops"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-pdfs' AND (storage.foldername(name))[1] = 'lesson-figures');