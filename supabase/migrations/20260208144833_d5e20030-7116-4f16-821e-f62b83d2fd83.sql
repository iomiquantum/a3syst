
-- Table to store API credentials per channel per clinic
CREATE TABLE public.channel_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'whatsapp', 'instagram', 'facebook', 'tiktok'
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, channel)
);

-- Enable RLS
ALTER TABLE public.channel_credentials ENABLE ROW LEVEL SECURITY;

-- Block anonymous
CREATE POLICY "Block anonymous access to channel_credentials"
ON public.channel_credentials AS RESTRICTIVE FOR ALL
USING (false);

-- Clinic members can view
CREATE POLICY "Clinic members can view channel_credentials"
ON public.channel_credentials AS RESTRICTIVE FOR SELECT
USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Clinic owners can manage
CREATE POLICY "Clinic owners can manage channel_credentials"
ON public.channel_credentials AS RESTRICTIVE FOR ALL
USING (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = channel_credentials.clinic_id AND clinics.owner_id = auth.uid()));

-- Super admin
CREATE POLICY "Super admin can manage all channel_credentials"
ON public.channel_credentials AS RESTRICTIVE FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Updated_at trigger
CREATE TRIGGER update_channel_credentials_updated_at
BEFORE UPDATE ON public.channel_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
