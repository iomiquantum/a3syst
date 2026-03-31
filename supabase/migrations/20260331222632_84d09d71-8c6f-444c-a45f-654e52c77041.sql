
-- FASE 1: Marketing tables

CREATE TABLE IF NOT EXISTS public.marketing_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, name)
);
ALTER TABLE marketing_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_tags" ON marketing_tags FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE TABLE IF NOT EXISTS public.marketing_fragments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'texto_plano',
  scope TEXT DEFAULT 'equipo',
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE marketing_fragments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_fragments" ON marketing_fragments FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE TABLE IF NOT EXISTS public.marketing_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'dinamica',
  filters JSONB DEFAULT '{}',
  contact_count INTEGER DEFAULT 0,
  estimated_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'activa',
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE marketing_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_audiences" ON marketing_audiences FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE TABLE IF NOT EXISTS public.marketing_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audience_id UUID REFERENCES public.marketing_audiences(id),
  template_name TEXT,
  template_language TEXT DEFAULT 'es_MX',
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'borrador',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE marketing_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_broadcasts" ON marketing_broadcasts FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_pipeline" ON pipeline_stages FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

-- FASE 2: Mi Negocio tables

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS google_tag_manager_id TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS google_analytics_id TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS consent_text TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS marketing_goals JSONB DEFAULT '{"ventas_meta": 0, "agendamientos_meta": 0}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS landing_hero_title TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS landing_hero_subtitle TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS landing_testimonials JSONB DEFAULT '[]';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS landing_visibility JSONB DEFAULT '{"show_services": true, "show_testimonials": true, "show_team": true, "show_contact": true}';

CREATE TABLE IF NOT EXISTS public.clinic_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clinic_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_activity" ON clinic_activity_log FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE INDEX idx_activity_clinic_date ON clinic_activity_log(clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clinic_trash (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  entity_data JSONB NOT NULL,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days')
);
ALTER TABLE clinic_trash ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_access_trash" ON clinic_trash FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE INDEX idx_trash_clinic ON clinic_trash(clinic_id, deleted_at DESC);
