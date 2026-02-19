
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can insert live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Anyone can update live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Block anonymous reads on live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Super admin can read live_sessions" ON public.live_sessions;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can insert live_sessions" ON public.live_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update live_sessions" ON public.live_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Super admin can read live_sessions" ON public.live_sessions FOR SELECT TO authenticated USING (is_super_admin());
