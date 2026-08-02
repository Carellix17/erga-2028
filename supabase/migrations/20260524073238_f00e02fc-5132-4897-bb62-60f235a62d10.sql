-- 1) Realtime channel authorization: restrict subscriptions to topics ending with the user's id
DROP POLICY IF EXISTS "Users can read their own realtime topics" ON realtime.messages;
CREATE POLICY "Users can read their own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%-' || (auth.uid())::text
  OR realtime.topic() LIKE '%:' || (auth.uid())::text
  OR realtime.topic() = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users can send to their own realtime topics" ON realtime.messages;
CREATE POLICY "Users can send to their own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%-' || (auth.uid())::text
  OR realtime.topic() LIKE '%:' || (auth.uid())::text
  OR realtime.topic() = (auth.uid())::text
);

-- 2) Storage: allow users to update/delete their own files in study-images
CREATE POLICY "Users can update their own study images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'study-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'study-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own study images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'study-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) Prevent privilege escalation on user_profiles: lock generation_count and is_beta_tester
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions using SERVICE_ROLE_KEY) to modify anything
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Force protected columns to their previous values
  NEW.generation_count := OLD.generation_count;
  NEW.is_beta_tester   := OLD.is_beta_tester;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profiles_privileged_columns ON public.user_profiles;
CREATE TRIGGER protect_user_profiles_privileged_columns
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_privileged_profile_updates();