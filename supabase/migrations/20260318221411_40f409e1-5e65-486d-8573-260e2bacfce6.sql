CREATE TABLE IF NOT EXISTS public.ai_agent_channel_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  additional_prompt TEXT DEFAULT '',
  welcome_message TEXT DEFAULT '',
  welcome_message_enabled BOOLEAN DEFAULT false,
  fallback_message TEXT DEFAULT 'Un momento, te comunico con un asesor humano.',
  max_response_length INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, channel)
);

CREATE OR REPLACE FUNCTION public.validate_channel_prompt_channel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.channel NOT IN ('whatsapp', 'facebook', 'instagram', 'web_chat') THEN
    RAISE EXCEPTION 'Invalid channel: %', NEW.channel;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_channel_prompt
  BEFORE INSERT OR UPDATE ON public.ai_agent_channel_prompts
  FOR EACH ROW EXECUTE FUNCTION public.validate_channel_prompt_channel();

CREATE TRIGGER trg_update_channel_prompts_updated_at
  BEFORE UPDATE ON public.ai_agent_channel_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.ai_agent_channel_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can manage channel prompts"
  ON public.ai_agent_channel_prompts
  FOR ALL
  TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all channel prompts"
  ON public.ai_agent_channel_prompts
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Block anonymous access to channel prompts"
  ON public.ai_agent_channel_prompts
  FOR ALL
  TO anon
  USING (false);