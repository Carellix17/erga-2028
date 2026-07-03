
-- Attach trigger to prevent users from modifying privileged columns via direct RLS update
DROP TRIGGER IF EXISTS prevent_privileged_profile_updates_trg ON public.user_profiles;
CREATE TRIGGER prevent_privileged_profile_updates_trg
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privileged_profile_updates();

-- Belt-and-suspenders: revoke column-level UPDATE privileges from client roles
REVOKE UPDATE (generation_count, is_beta_tester) ON public.user_profiles FROM authenticated;
REVOKE UPDATE (generation_count, is_beta_tester) ON public.user_profiles FROM anon;
