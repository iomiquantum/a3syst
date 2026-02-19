-- Create page_visits table for campaign analytics
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  session_id TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: allow anonymous inserts (public tracking), super admin reads
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page visits"
ON public.page_visits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Super admin can read page visits"
ON public.page_visits FOR SELECT
USING (is_super_admin());

CREATE POLICY "Block anonymous reads"
ON public.page_visits FOR SELECT
USING (false);

-- Index for analytics queries
CREATE INDEX idx_page_visits_created_at ON public.page_visits (created_at DESC);
CREATE INDEX idx_page_visits_utm ON public.page_visits (utm_source, utm_campaign);