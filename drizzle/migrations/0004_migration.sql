ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_environment_key;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_text text, check_env text DEFAULT 'live'::text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = (auth.uid())::text
      AND environment = check_env
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

-- Pro per un utente qualsiasi (usato dai controlli lato server), in entrambi gli ambienti
CREATE OR REPLACE FUNCTION public.user_is_pro(_user_id text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = _user_id AND is_beta_tester = true)
  OR EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.user_is_pro(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.user_is_pro(text) TO service_role;

-- Piano Free: massimo 10 nuovi corsi negli ultimi 7 giorni
CREATE OR REPLACE FUNCTION public.enforce_free_course_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;
  IF public.user_is_pro(NEW.user_id) THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.study_contexts
      WHERE user_id = NEW.user_id AND is_demo = false
        AND created_at > now() - interval '7 days') >= 10 THEN
    RAISE EXCEPTION 'FREE_COURSE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_course_limit_trg ON public.study_contexts;
CREATE TRIGGER enforce_free_course_limit_trg BEFORE INSERT ON public.study_contexts
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_course_limit();