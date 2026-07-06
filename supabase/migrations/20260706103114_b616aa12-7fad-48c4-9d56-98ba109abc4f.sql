REVOKE UPDATE (generation_count, is_beta_tester) ON public.user_profiles FROM authenticated;
REVOKE INSERT (generation_count, is_beta_tester) ON public.user_profiles FROM authenticated;