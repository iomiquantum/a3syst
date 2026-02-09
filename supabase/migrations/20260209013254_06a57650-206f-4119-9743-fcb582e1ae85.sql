
-- Table for clinic brand styles (up to 3 per clinic)
CREATE TABLE public.clinic_brand_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Estilo 1',
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  palette JSONB NOT NULL DEFAULT '[]',
  style_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_brand_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to clinic_brand_styles"
ON public.clinic_brand_styles FOR ALL USING (false);

CREATE POLICY "Clinic members can view brand styles"
ON public.clinic_brand_styles FOR SELECT
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can manage brand styles"
ON public.clinic_brand_styles FOR ALL
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all brand styles"
ON public.clinic_brand_styles FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE TRIGGER update_clinic_brand_styles_updated_at
BEFORE UPDATE ON public.clinic_brand_styles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for brand reference images
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-references', 'brand-references', true);

CREATE POLICY "Users can upload brand references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-references' AND auth.uid() IS NOT NULL);

CREATE POLICY "Brand references are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-references');

CREATE POLICY "Users can delete their brand references"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-references' AND auth.uid() IS NOT NULL);
