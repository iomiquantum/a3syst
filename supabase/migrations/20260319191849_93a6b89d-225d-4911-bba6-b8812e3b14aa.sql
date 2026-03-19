
CREATE TABLE IF NOT EXISTS public.pipeline_execution_lock (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_running BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ
);
INSERT INTO public.pipeline_execution_lock (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.pipeline_execution_lock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.pipeline_execution_lock
  FOR ALL TO service_role USING (true) WITH CHECK (true);
