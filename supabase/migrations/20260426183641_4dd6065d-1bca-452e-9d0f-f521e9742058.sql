-- Make lesson_progress per-context (per study path) instead of per-user
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS context_id uuid;

-- Drop existing user-only unique constraint(s) if present
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.lesson_progress'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.lesson_progress DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- One progress row per (user, context). NULL context = legacy/global path.
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_user_context_unique
  ON public.lesson_progress (user_id, COALESCE(context_id::text, ''));
