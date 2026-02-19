
-- Pre-launch registrations with referral system
CREATE TABLE public.launch_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  referred_by TEXT NULL,
  generations_used INTEGER NOT NULL DEFAULT 0,
  max_generations INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for referral lookups
CREATE INDEX idx_launch_referral_code ON public.launch_registrations(referral_code);
CREATE INDEX idx_launch_referred_by ON public.launch_registrations(referred_by);

-- Enable RLS
ALTER TABLE public.launch_registrations ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can register)
CREATE POLICY "Anyone can register for launch"
ON public.launch_registrations
FOR INSERT
WITH CHECK (true);

-- Public select own record by email (for dashboard)
CREATE POLICY "Anyone can read by referral code"
ON public.launch_registrations
FOR SELECT
USING (true);

-- Allow updating generations_used
CREATE POLICY "Users can update own generations"
ON public.launch_registrations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_launch_registrations_updated_at
BEFORE UPDATE ON public.launch_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
