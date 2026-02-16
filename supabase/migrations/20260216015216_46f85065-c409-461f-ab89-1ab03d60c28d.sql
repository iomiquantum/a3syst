
-- Table to store custom labels per business
CREATE TABLE public.business_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  labels jsonb NOT NULL DEFAULT '{
    "patients": "Clientes",
    "treatments": "Servicios",
    "professionals": "Equipo",
    "branches": "Sucursales",
    "appointments": "Citas",
    "sales": "Ventas",
    "business": "Negocio",
    "specialties": "Categorías"
  }'::jsonb,
  initial_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id)
);

-- Enable RLS
ALTER TABLE public.business_labels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Block anonymous access to business_labels"
ON public.business_labels FOR ALL USING (false);

CREATE POLICY "Clinic members can view business_labels"
ON public.business_labels FOR SELECT
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can manage business_labels"
ON public.business_labels FOR ALL
USING (user_has_clinic_access(auth.uid(), clinic_id))
WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all business_labels"
ON public.business_labels FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_business_labels_updated_at
BEFORE UPDATE ON public.business_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create default labels for existing clinics
INSERT INTO public.business_labels (clinic_id)
SELECT id FROM public.clinics
ON CONFLICT (clinic_id) DO NOTHING;
