
-- =============================================
-- ADS MODULE TABLES
-- =============================================

-- 1. Connected ad platform accounts (Meta, Google, TikTok)
CREATE TABLE public.ads_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'pending', 'disconnected')),
  credentials JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, platform)
);

-- 2. Business briefs (ADN)
CREATE TABLE public.ads_business_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mi Brief',
  answers JSONB NOT NULL DEFAULT '[]',
  audio_url TEXT,
  business_name TEXT,
  industry TEXT,
  description TEXT,
  locations JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Strategy templates
CREATE TABLE public.ads_strategy_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'Conversiones',
  min_budget NUMERIC NOT NULL DEFAULT 4,
  currency TEXT NOT NULL DEFAULT 'USD',
  media_type TEXT NOT NULL CHECK (media_type IN ('images', 'videos')),
  media_count INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  is_global BOOLEAN NOT NULL DEFAULT true,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Launched campaigns
CREATE TABLE public.ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.ads_accounts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.ads_strategy_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'error')),
  platform TEXT NOT NULL DEFAULT 'meta',
  daily_budget NUMERIC NOT NULL DEFAULT 3,
  currency TEXT NOT NULL DEFAULT 'USD',
  creatives_count INTEGER NOT NULL DEFAULT 0,
  external_campaign_id TEXT,
  metrics JSONB NOT NULL DEFAULT '{"spend":0,"conversions":0,"reach":0,"revenue":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_business_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_strategy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS: ads_accounts
CREATE POLICY "Users can view their clinic ads_accounts"
  ON public.ads_accounts FOR SELECT
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can insert their clinic ads_accounts"
  ON public.ads_accounts FOR INSERT
  WITH CHECK (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can update their clinic ads_accounts"
  ON public.ads_accounts FOR UPDATE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can delete their clinic ads_accounts"
  ON public.ads_accounts FOR DELETE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- RLS: ads_business_briefs
CREATE POLICY "Users can view their clinic briefs"
  ON public.ads_business_briefs FOR SELECT
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can insert their clinic briefs"
  ON public.ads_business_briefs FOR INSERT
  WITH CHECK (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can update their clinic briefs"
  ON public.ads_business_briefs FOR UPDATE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can delete their clinic briefs"
  ON public.ads_business_briefs FOR DELETE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- RLS: ads_strategy_templates (global ones readable by all authenticated, clinic-specific by access)
CREATE POLICY "Authenticated users can view global templates"
  ON public.ads_strategy_templates FOR SELECT
  USING (is_global = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their clinic templates"
  ON public.ads_strategy_templates FOR SELECT
  USING (is_global = false AND clinic_id IS NOT NULL AND public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can insert their clinic templates"
  ON public.ads_strategy_templates FOR INSERT
  WITH CHECK (clinic_id IS NOT NULL AND public.user_has_clinic_access(auth.uid(), clinic_id));

-- RLS: ads_campaigns
CREATE POLICY "Users can view their clinic campaigns"
  ON public.ads_campaigns FOR SELECT
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can insert their clinic campaigns"
  ON public.ads_campaigns FOR INSERT
  WITH CHECK (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can update their clinic campaigns"
  ON public.ads_campaigns FOR UPDATE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can delete their clinic campaigns"
  ON public.ads_campaigns FOR DELETE
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- Triggers for updated_at
CREATE TRIGGER update_ads_accounts_updated_at BEFORE UPDATE ON public.ads_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_ads_briefs_updated_at BEFORE UPDATE ON public.ads_business_briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_ads_campaigns_updated_at BEFORE UPDATE ON public.ads_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed global strategy templates
INSERT INTO public.ads_strategy_templates (name, channel, objective, min_budget, media_type, media_count, is_global) VALUES
  ('Ventas Instagram: Estrategia Legión (Advantage)', 'Instagram', 'Conversiones', 4, 'images', 20, true),
  ('Ventas Instagram: Estrategia Versátil (Advantage)', 'Instagram', 'Conversiones', 4, 'videos', 10, true),
  ('Ventas Instagram +Advantage 5 IMG', 'Instagram', 'Conversiones', 4, 'images', 5, true),
  ('Ventas Instagram: Estrategia Gladiador (Advantage)', 'Instagram', 'Conversiones', 4, 'videos', 20, true),
  ('Ventas Instagram: Estrategia Espartana (Advantage)', 'Instagram', 'Conversiones', 4, 'videos', 10, true),
  ('Ventas a WhatsApp: Estrategia Blindada (Advantage)', 'WhatsApp', 'Conversiones', 4, 'images', 20, true),
  ('Ventas a WhatsApp: Estrategia de Selección (Segmentación)', 'WhatsApp', 'Conversiones', 4, 'images', 10, true),
  ('Ventas a WhatsApp: Estrategia Escudo (Advantage)', 'WhatsApp', 'Conversiones', 4, 'images', 10, true),
  ('Ventas a WhatsApp: Estrategia de Vanguardia (Advantage)', 'WhatsApp', 'Conversiones', 4, 'videos', 20, true),
  ('Ventas a WhatsApp: Estrategia Magnética (Segmentación)', 'WhatsApp', 'Conversiones', 4, 'videos', 10, true),
  ('Ventas a WhatsApp: Estrategia de Flujo (Advantage)', 'WhatsApp', 'Conversiones', 4, 'videos', 10, true),
  ('Ventas a WhatsApp: Estrategia Imperial (Segmentación Inteligente)', 'WhatsApp', 'Conversiones', 4, 'videos', 5, true),
  ('Ventas en Sitio Web: Estrategia de Élite (Advantage)', 'Web', 'Conversiones', 4, 'images', 20, true),
  ('Ventas en Sitio Web: Estrategia Relámpago (Advantage)', 'Web', 'Conversiones', 4, 'images', 10, true),
  ('Ventas en Sitio Web: Estrategia Radar (Segmentación Inteligente)', 'Web', 'Conversiones', 4, 'images', 10, true),
  ('Ventas en Sitio Web: Estrategia Leonidas (Advantage)', 'Web', 'Conversiones', 4, 'videos', 20, true),
  ('Ventas en Sitio Web: Estrategia de Asalto (Segmentación Inteligente)', 'Web', 'Conversiones', 4, 'videos', 5, true);
