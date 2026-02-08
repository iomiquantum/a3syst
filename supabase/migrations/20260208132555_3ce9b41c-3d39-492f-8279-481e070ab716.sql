
-- Table for AI agent configuration per clinic
CREATE TABLE public.ai_agent_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Asistente Virtual',
  language TEXT NOT NULL DEFAULT 'es',
  tone TEXT NOT NULL DEFAULT 'profesional',
  greeting TEXT NOT NULL DEFAULT '¡Hola! 👋 Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?',
  objective TEXT NOT NULL DEFAULT '',
  special_instructions TEXT NOT NULL DEFAULT '',
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id)
);

ALTER TABLE public.ai_agent_config ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anonymous access to ai_agent_config"
  ON public.ai_agent_config AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Clinic members can view
CREATE POLICY "Clinic members can view ai_agent_config"
  ON public.ai_agent_config FOR SELECT TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Clinic members can manage
CREATE POLICY "Clinic members can manage ai_agent_config"
  ON public.ai_agent_config FOR ALL TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Super admin
CREATE POLICY "Super admin can manage all ai_agent_config"
  ON public.ai_agent_config FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Timestamp trigger
CREATE TRIGGER update_ai_agent_config_updated_at
  BEFORE UPDATE ON public.ai_agent_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
