REVOKE EXECUTE ON FUNCTION public.is_demo_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_demo_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_demo_admin(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_admin(text) TO service_role;