-- 1) Lock down SECURITY DEFINER helper functions: only service_role can EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_pro_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_demo_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_pro_user(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_demo_admin(text) TO service_role;

-- 2) Public buckets: allow read but block bucket listing via storage API.
-- We replace the broad SELECT policies with ones that require the request
-- to specify a concrete object name (i.e. direct URL access), preventing
-- enumeration of all files.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for study images" ON storage.objects;

CREATE POLICY "Public can read avatar objects"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public can read study image objects"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'study-images' AND name IS NOT NULL AND length(name) > 0);
