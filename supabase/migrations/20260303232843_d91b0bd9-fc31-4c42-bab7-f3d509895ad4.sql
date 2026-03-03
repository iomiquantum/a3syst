
-- Social Media Connections table
CREATE TABLE public.social_media_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'linkedin', 'whatsapp')),
  platform_name TEXT NOT NULL DEFAULT '',
  platform_account_id TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  token_status TEXT DEFAULT 'active' CHECK (token_status IN ('active', 'expired', 'revoked', 'pending')),
  token_expires_at TIMESTAMPTZ,
  token_last_verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  connected_by UUID,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, platform, platform_account_id)
);

CREATE INDEX idx_social_connections_clinic ON social_media_connections(clinic_id);
CREATE INDEX idx_social_connections_platform ON social_media_connections(clinic_id, platform);
CREATE INDEX idx_social_connections_status ON social_media_connections(token_status);

ALTER TABLE social_media_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Block anonymous access to social_media_connections"
  ON social_media_connections FOR ALL
  USING (false);

CREATE POLICY "Clinic members can view social_media_connections"
  ON social_media_connections FOR SELECT
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can manage social_media_connections"
  ON social_media_connections FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all social_media_connections"
  ON social_media_connections FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE TRIGGER update_social_connections_timestamp
  BEFORE UPDATE ON social_media_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Social Media Posts Log table
CREATE TABLE public.social_media_posts_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.social_media_connections(id) ON DELETE CASCADE,
  content_post_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_type TEXT DEFAULT 'image' CHECK (post_type IN ('text', 'image', 'video', 'carousel', 'story', 'reel')),
  content_text TEXT,
  media_urls TEXT[],
  platform_post_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  engagement_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_posts_log_clinic ON social_media_posts_log(clinic_id);
CREATE INDEX idx_posts_log_status ON social_media_posts_log(status);
CREATE INDEX idx_posts_log_scheduled ON social_media_posts_log(scheduled_for) WHERE status = 'scheduled';

ALTER TABLE social_media_posts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to social_media_posts_log"
  ON social_media_posts_log FOR ALL
  USING (false);

CREATE POLICY "Clinic members can view social_media_posts_log"
  ON social_media_posts_log FOR SELECT
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can manage social_media_posts_log"
  ON social_media_posts_log FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all social_media_posts_log"
  ON social_media_posts_log FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
