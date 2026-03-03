
-- Add new columns to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT '';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS opening_hour text DEFAULT '09:00';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS closing_hour text DEFAULT '18:00';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS working_days text[] DEFAULT '{Lun,Mar,Mié,Jue,Vie}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add image_url to treatments
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS image_url text;

-- Add visitor fields to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS visitor_name text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS visitor_contact text;

-- Create ai_training_data table
CREATE TABLE IF NOT EXISTS public.ai_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon ai_training_data" ON public.ai_training_data FOR ALL USING (false);
CREATE POLICY "Clinic members can view ai_training_data" ON public.ai_training_data FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage ai_training_data" ON public.ai_training_data FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin ai_training_data" ON public.ai_training_data FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Allow public read on clinics by slug (for landing page)
CREATE POLICY "Public can view clinics by slug" ON public.clinics FOR SELECT USING (slug IS NOT NULL AND onboarding_completed = true);

-- Allow public read on treatments for public landing
CREATE POLICY "Public can view treatments for public clinics" ON public.treatments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE clinics.id = treatments.clinic_id AND clinics.slug IS NOT NULL AND clinics.onboarding_completed = true)
);

-- Allow public read on ai_agent_config for public clinics
CREATE POLICY "Public can view ai_agent_config for public clinics" ON public.ai_agent_config FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE clinics.id = ai_agent_config.clinic_id AND clinics.slug IS NOT NULL AND clinics.onboarding_completed = true)
);

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_clinic_slug(clinic_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Normalize: lowercase, remove accents, replace spaces with hyphens
  base_slug := lower(trim(clinic_name));
  base_slug := translate(base_slug, 'áéíóúüñ', 'aeiouun');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' THEN base_slug := 'negocio'; END IF;
  
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;
