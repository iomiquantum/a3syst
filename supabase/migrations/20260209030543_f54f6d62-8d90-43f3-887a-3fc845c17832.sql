
-- Add monthly token budget to clinics (NULL = unlimited/open)
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS monthly_token_budget_usd numeric DEFAULT NULL;

-- Create user token limits table
CREATE TABLE public.user_token_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  monthly_budget_usd numeric DEFAULT NULL, -- NULL = unlimited/open
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

ALTER TABLE public.user_token_limits ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anonymous access to user_token_limits"
  ON public.user_token_limits FOR ALL USING (false);

-- Super admin full access
CREATE POLICY "Super admin can manage all user_token_limits"
  ON public.user_token_limits FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Clinic owners can manage
CREATE POLICY "Clinic owners can manage user_token_limits"
  ON public.user_token_limits FOR ALL
  USING (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = user_token_limits.clinic_id AND clinics.owner_id = auth.uid()));

-- Users can view their own limits
CREATE POLICY "Users can view own token limits"
  ON public.user_token_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_token_limits_updated_at
  BEFORE UPDATE ON public.user_token_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
