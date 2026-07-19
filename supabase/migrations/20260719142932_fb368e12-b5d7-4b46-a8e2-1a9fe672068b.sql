-- Migration 1: demo rate limits
CREATE TABLE IF NOT EXISTS public.demo_rate_limits (
  ip_hash      text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demo_rate_limits IS
  'Contatore anti-abuso per le generazioni demo anonime (per hash IP, finestra mobile 24h).';

ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_increment_demo_usage(
  p_ip_hash text,
  p_window interval DEFAULT '24 hours'
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.demo_rate_limits (ip_hash, window_start, request_count)
  VALUES (p_ip_hash, now(), 1)
  ON CONFLICT (ip_hash) DO UPDATE SET
    request_count = CASE
      WHEN demo_rate_limits.window_start < now() - p_window THEN 1
      ELSE demo_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN demo_rate_limits.window_start < now() - p_window THEN now()
      ELSE demo_rate_limits.window_start
    END
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_demo_usage(text, interval) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_demo_usage(text, interval) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_demo_rate_limits()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.demo_rate_limits
  WHERE window_start < now() - interval '7 days';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_demo_rate_limits() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_rate_limits() TO service_role;

-- Migration 2: evaluations.goal column
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS goal smallint;

COMMENT ON COLUMN public.evaluations.goal IS
  'Voto obiettivo della verifica/compito (1-10, opzionale). Guida la priorita del piano AI.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluations_goal_range'
  ) THEN
    ALTER TABLE public.evaluations
      ADD CONSTRAINT evaluations_goal_range
      CHECK (goal IS NULL OR (goal BETWEEN 1 AND 10));
  END IF;
END $$;