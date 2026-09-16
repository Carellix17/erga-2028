ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;