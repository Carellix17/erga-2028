ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_test JSONB;