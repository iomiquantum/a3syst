
-- Agregar columnas para soporte de app propia a social_media_connections
ALTER TABLE public.social_media_connections 
  ADD COLUMN IF NOT EXISTS app_mode TEXT DEFAULT 'shared' CHECK (app_mode IN ('shared', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_app_id TEXT,
  ADD COLUMN IF NOT EXISTS custom_app_secret_encrypted TEXT;

COMMENT ON COLUMN public.social_media_connections.app_mode IS 'shared = usa app a3syst, custom = usa app propia del negocio';
COMMENT ON COLUMN public.social_media_connections.custom_app_id IS 'App ID de Meta cuando el negocio usa su propia app';
COMMENT ON COLUMN public.social_media_connections.custom_app_secret_encrypted IS 'App Secret encriptado cuando el negocio usa su propia app';

-- Crear tabla meta_app_configurations
CREATE TABLE public.meta_app_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  app_mode TEXT DEFAULT 'shared' CHECK (app_mode IN ('shared', 'custom')),
  shared_app_id TEXT DEFAULT '850630404695074',
  custom_app_id TEXT,
  custom_app_secret_encrypted TEXT,
  custom_app_name TEXT,
  custom_app_status TEXT DEFAULT 'pending' CHECK (custom_app_status IN ('pending', 'verified', 'active', 'suspended', 'error')),
  custom_app_verified_at TIMESTAMPTZ,
  setup_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  configured_by UUID,
  UNIQUE(clinic_id)
);

-- Índice
CREATE INDEX idx_meta_app_config_clinic ON public.meta_app_configurations(clinic_id);

-- RLS
ALTER TABLE public.meta_app_configurations ENABLE ROW LEVEL SECURITY;

-- Block anonymous
CREATE POLICY "Block anonymous access to meta_app_configurations"
  ON public.meta_app_configurations FOR ALL
  USING (false);

-- Clinic members can manage
CREATE POLICY "Clinic members can manage meta_app_configurations"
  ON public.meta_app_configurations FOR ALL
  TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

-- Clinic members can view
CREATE POLICY "Clinic members can view meta_app_configurations"
  ON public.meta_app_configurations FOR SELECT
  TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id));

-- Super admin
CREATE POLICY "Super admin can manage all meta_app_configurations"
  ON public.meta_app_configurations FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Trigger updated_at
CREATE TRIGGER update_meta_app_config_timestamp
  BEFORE UPDATE ON public.meta_app_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
