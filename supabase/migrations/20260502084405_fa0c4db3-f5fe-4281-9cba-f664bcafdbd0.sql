
-- 1) Drop misconfigured public read policy on study-pdfs (lesson figures actually live in study-images)
DROP POLICY IF EXISTS "Public can read lesson figure crops" ON storage.objects;

-- 2) Drop overly permissive INSERT policy that allowed anyone (public role) to upload to study-images
DROP POLICY IF EXISTS "Service role upload for study images" ON storage.objects;

-- 3) Add UPDATE RLS policy to chat_messages, mirroring SELECT/INSERT/DELETE ownership
CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
    AND c.user_id = (auth.uid())::text
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
    AND c.user_id = (auth.uid())::text
));

-- 4) Harden SECURITY DEFINER subscription RPCs: ignore caller-supplied user_text,
--    always check the authenticated caller via auth.uid(). Signature kept for
--    backward compatibility with existing client callers.
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_text text, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = (auth.uid())::text
      AND environment = check_env
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_pro_user(user_text text, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (auth.uid())::text AND is_beta_tester = true
    )
    OR public.has_active_subscription((auth.uid())::text, check_env);
$function$;

-- 5) Restrict EXECUTE on these SECURITY DEFINER functions: revoke from anon/public,
--    keep authenticated (they only return data about the caller now).
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_pro_user(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_pro_user(text, text) TO authenticated, service_role;
