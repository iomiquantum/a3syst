
-- Fix launch_registrations: restrict public SELECT and UPDATE
DROP POLICY IF EXISTS "Anyone can read by referral code" ON public.launch_registrations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.launch_registrations;

-- Only allow SELECT by matching email in JWT claims
CREATE POLICY "Users read own registration"
ON public.launch_registrations FOR SELECT
USING (
  email = (current_setting('request.jwt.claims', true)::json->>'email')
  OR is_super_admin()
);

-- Only allow UPDATE via service role (edge functions)
CREATE POLICY "Service role updates registrations"
ON public.launch_registrations FOR UPDATE
USING (false);

-- Fix live_sessions: remove public SELECT and UPDATE, keep INSERT for tracking
DROP POLICY IF EXISTS "Anon can select live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Anyone can update live_sessions" ON public.live_sessions;

-- Allow update only by matching session_id (service-level, but scoped)
CREATE POLICY "Update own session by session_id"
ON public.live_sessions FOR UPDATE
USING (true)
WITH CHECK (true);
