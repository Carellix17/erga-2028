REVOKE UPDATE, INSERT ON public.user_profiles FROM authenticated, anon;

GRANT INSERT (id, user_id, institute_type, subject_levels, created_at, updated_at,
              first_name, last_name, nickname, age, school, avatar_url,
              subject_goals, has_completed_onboarding, last_studio_context_id)
  ON public.user_profiles TO authenticated;

GRANT UPDATE (institute_type, subject_levels, updated_at,
              first_name, last_name, nickname, age, school, avatar_url,
              subject_goals, has_completed_onboarding, last_studio_context_id)
  ON public.user_profiles TO authenticated;

GRANT ALL ON public.user_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_inserts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.generation_count := 0;
  NEW.is_beta_tester := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privileged_profile_inserts_trg ON public.user_profiles;
CREATE TRIGGER prevent_privileged_profile_inserts_trg
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privileged_profile_inserts();

DROP TRIGGER IF EXISTS protect_user_profiles_privileged_columns ON public.user_profiles;