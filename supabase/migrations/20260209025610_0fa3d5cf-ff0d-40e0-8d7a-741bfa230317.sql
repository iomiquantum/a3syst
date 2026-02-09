
-- Table for tracking AI token consumption across all generators
CREATE TABLE public.ai_token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  generator_type TEXT NOT NULL DEFAULT 'copy',
  model TEXT NOT NULL DEFAULT '',
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Block anonymous access to ai_token_usage"
  ON public.ai_token_usage FOR ALL
  USING (false);

CREATE POLICY "Clinic members can view ai_token_usage"
  ON public.ai_token_usage FOR SELECT
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can insert ai_token_usage"
  ON public.ai_token_usage FOR INSERT
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all ai_token_usage"
  ON public.ai_token_usage FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Index for efficient time-based queries
CREATE INDEX idx_ai_token_usage_clinic_created ON public.ai_token_usage (clinic_id, created_at DESC);
CREATE INDEX idx_ai_token_usage_type ON public.ai_token_usage (generator_type);
