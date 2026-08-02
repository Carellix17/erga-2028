-- 1. Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  paddle_subscription_id TEXT NOT NULL UNIQUE,
  paddle_customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, environment)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Service role manages subscriptions insert"
  ON public.subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role manages subscriptions update"
  ON public.subscriptions FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role manages subscriptions delete"
  ON public.subscriptions FOR DELETE
  TO service_role
  USING (true);

-- 2. Beta tester flag on user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN is_beta_tester BOOLEAN NOT NULL DEFAULT false;

-- 3. Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. has_active_subscription helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_text TEXT,
  check_env TEXT DEFAULT 'live'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_text
      AND environment = check_env
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- 5. is_pro_user: beta tester OR active subscription
CREATE OR REPLACE FUNCTION public.is_pro_user(
  user_text TEXT,
  check_env TEXT DEFAULT 'live'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = user_text AND is_beta_tester = true
    )
    OR public.has_active_subscription(user_text, check_env);
$$;