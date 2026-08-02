DROP TRIGGER IF EXISTS prevent_privileged_profile_updates_trg ON public.user_profiles;
CREATE TRIGGER prevent_privileged_profile_updates_trg
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_privileged_profile_updates();