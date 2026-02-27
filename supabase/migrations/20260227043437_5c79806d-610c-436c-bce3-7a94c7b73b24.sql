
-- Fix 1: Remove overly permissive SELECT policy on launch_registrations
DROP POLICY IF EXISTS "Anyone can read by referral code" ON public.launch_registrations;

-- Allow users to read their own registration by matching email
CREATE POLICY "Users can read own launch registration"
ON public.launch_registrations FOR SELECT
USING (
  email = (current_setting('request.jwt.claims', true)::json->>'email')
  OR is_super_admin()
);

-- Create a safe leaderboard function that only returns non-PII fields
CREATE OR REPLACE FUNCTION public.get_launch_leaderboard()
RETURNS TABLE(
  id uuid,
  full_name text,
  business_name text,
  referral_count integer,
  previous_position integer,
  referral_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, full_name, business_name, referral_count, previous_position, referral_code
  FROM public.launch_registrations
  ORDER BY referral_count DESC
  LIMIT 100;
$$;
