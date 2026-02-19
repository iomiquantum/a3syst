
-- Create table for tracking click events for heatmap
CREATE TABLE public.click_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path text NOT NULL DEFAULT '/',
  x_percent numeric NOT NULL,
  y_percent numeric NOT NULL,
  viewport_width integer,
  viewport_height integer,
  element_tag text,
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert click events (anonymous tracking)
CREATE POLICY "Anyone can insert click events"
ON public.click_events
FOR INSERT
WITH CHECK (true);

-- Block anonymous reads
CREATE POLICY "Block anonymous reads on click_events"
ON public.click_events
FOR SELECT
USING (false);

-- Super admin can read click events
CREATE POLICY "Super admin can read click_events"
ON public.click_events
FOR SELECT
USING (is_super_admin());

-- Index for efficient querying by page and date
CREATE INDEX idx_click_events_page_path ON public.click_events (page_path);
CREATE INDEX idx_click_events_created_at ON public.click_events (created_at);
