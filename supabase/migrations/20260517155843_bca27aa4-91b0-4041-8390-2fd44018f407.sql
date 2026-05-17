CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own push subs" ON public.push_subscriptions;
CREATE POLICY "Users view own push subs" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users insert own push subs" ON public.push_subscriptions;
CREATE POLICY "Users insert own push subs" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users update own push subs" ON public.push_subscriptions;
CREATE POLICY "Users update own push subs" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users delete own push subs" ON public.push_subscriptions;
CREATE POLICY "Users delete own push subs" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Service role manages push subs" ON public.push_subscriptions;
CREATE POLICY "Service role manages push subs" ON public.push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();