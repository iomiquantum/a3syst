
-- Table to store admin-managed prompt templates for AI content generation
CREATE TABLE public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'copy')),
  name text NOT NULL DEFAULT 'Plantilla principal',
  template text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Only super admin can manage prompt templates
CREATE POLICY "Super admin can manage prompt_templates"
  ON public.prompt_templates FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Clinic members can read active templates (needed for generation)
CREATE POLICY "Clinic members can view prompt_templates"
  ON public.prompt_templates FOR SELECT
  USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Block anonymous
CREATE POLICY "Block anonymous access to prompt_templates"
  ON public.prompt_templates FOR ALL
  USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
