CREATE TABLE public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  fn text,
  provider text,
  model text,
  ok boolean NOT NULL DEFAULT true,
  status int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_usage_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ai_usage_id_seq TO service_role;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_insert_authenticated" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ai_usage_insert_service_role" ON public.ai_usage
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "ai_usage_select_service_role" ON public.ai_usage
  FOR SELECT TO service_role USING (true);

CREATE INDEX ai_usage_user_created_idx ON public.ai_usage (user_id, created_at DESC);