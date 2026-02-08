
-- Table for clinic services used in Psycho-Matrix
CREATE TABLE public.psycho_matrix_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  core_benefit TEXT NOT NULL DEFAULT '',
  pain_point TEXT NOT NULL DEFAULT '',
  target_price TEXT NOT NULL DEFAULT 'mid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.psycho_matrix_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to psycho_matrix_services" ON public.psycho_matrix_services AS RESTRICTIVE FOR ALL USING (false);
CREATE POLICY "Clinic members can view psycho_matrix_services" ON public.psycho_matrix_services FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage psycho_matrix_services" ON public.psycho_matrix_services FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin can manage all psycho_matrix_services" ON public.psycho_matrix_services FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_psycho_matrix_services_updated_at BEFORE UPDATE ON public.psycho_matrix_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table for saved strategy combinations
CREATE TABLE public.psycho_matrix_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.psycho_matrix_services(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mi Estrategia',
  archetype TEXT NOT NULL,
  brand_voice TEXT NOT NULL,
  persuasion_trigger TEXT NOT NULL,
  generation TEXT NOT NULL,
  advanced_tech TEXT,
  generated_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.psycho_matrix_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to psycho_matrix_strategies" ON public.psycho_matrix_strategies AS RESTRICTIVE FOR ALL USING (false);
CREATE POLICY "Clinic members can view psycho_matrix_strategies" ON public.psycho_matrix_strategies FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage psycho_matrix_strategies" ON public.psycho_matrix_strategies FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin can manage all psycho_matrix_strategies" ON public.psycho_matrix_strategies FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_psycho_matrix_strategies_updated_at BEFORE UPDATE ON public.psycho_matrix_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
