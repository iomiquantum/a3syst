
CREATE TABLE IF NOT EXISTS public.pipeline_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  moved_to_c1 INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  moved_to_no_responden INTEGER DEFAULT 0,
  inconsistencies_fixed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INTEGER
);

ALTER TABLE public.pipeline_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read execution logs"
  ON public.pipeline_execution_log FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Service role can insert execution logs"
  ON public.pipeline_execution_log FOR INSERT TO service_role
  WITH CHECK (true);

-- Add recurrente_max_cycles rule if missing
INSERT INTO public.pipeline_global_rules (rule_key, rule_value, description)
VALUES ('recurrente_max_cycles', '0', 'Ciclos recurrentes máximos (0 = ilimitados)')
ON CONFLICT DO NOTHING;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
