
-- Create ai_agent_usage table to track each AI invocation
CREATE TABLE public.ai_agent_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT '',
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_usage ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to ai_agent_usage"
ON public.ai_agent_usage AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Clinic members can view usage
CREATE POLICY "Clinic members can view ai_agent_usage"
ON public.ai_agent_usage AS RESTRICTIVE FOR SELECT
USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Super admin full access
CREATE POLICY "Super admin can manage all ai_agent_usage"
ON public.ai_agent_usage AS RESTRICTIVE FOR ALL
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Service role needs to insert (from edge function), so add a permissive policy for authenticated inserts
-- Edge function uses service_role_key which bypasses RLS, so no extra policy needed for inserts

-- Index for fast lookups
CREATE INDEX idx_ai_agent_usage_clinic_id ON public.ai_agent_usage(clinic_id);
CREATE INDEX idx_ai_agent_usage_created_at ON public.ai_agent_usage(created_at);
