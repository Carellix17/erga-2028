-- Drop existing public role policies on user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;

-- Recreate with authenticated role
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own profile"
ON public.user_profiles FOR DELETE
TO authenticated
USING (user_id = (auth.uid())::text);