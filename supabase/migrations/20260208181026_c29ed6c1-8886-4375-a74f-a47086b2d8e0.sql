
-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Content posts table
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT NOT NULL DEFAULT 'image',
  post_type TEXT NOT NULL DEFAULT 'post',
  status TEXT NOT NULL DEFAULT 'draft',
  platforms TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  hashtags TEXT[] DEFAULT '{}',
  link_url TEXT,
  first_comment TEXT,
  metrics JSONB DEFAULT '{"likes":0,"comments":0,"shares":0,"reach":0,"impressions":0}'::jsonb,
  external_ids JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinic content" ON public.content_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = content_posts.clinic_id)
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert own clinic content" ON public.content_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = content_posts.clinic_id)
    OR public.is_super_admin()
  );

CREATE POLICY "Users can update own clinic content" ON public.content_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = content_posts.clinic_id)
    OR public.is_super_admin()
  );

CREATE POLICY "Users can delete own clinic content" ON public.content_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = content_posts.clinic_id)
    OR public.is_super_admin()
  );

CREATE INDEX idx_content_posts_clinic ON public.content_posts(clinic_id);
CREATE INDEX idx_content_posts_status ON public.content_posts(status);
CREATE INDEX idx_content_posts_scheduled ON public.content_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_content_posts_created ON public.content_posts(created_at DESC);

CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
