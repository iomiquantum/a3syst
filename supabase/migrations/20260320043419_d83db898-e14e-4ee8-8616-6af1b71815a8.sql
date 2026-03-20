
-- Pipeline Message Queue table for resilient message sending
CREATE TABLE IF NOT EXISTS public.pipeline_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_number INTEGER NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'seguimiento',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  generated_message TEXT,
  sent_at TIMESTAMPTZ,
  resolved_manually_by UUID,
  resolved_manually_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_pending ON public.pipeline_message_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_retry ON public.pipeline_message_queue(status, last_attempt_at) WHERE status = 'retry';
CREATE INDEX IF NOT EXISTS idx_queue_conv ON public.pipeline_message_queue(conversation_id, status);

ALTER TABLE public.pipeline_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_view_queue" ON public.pipeline_message_queue
  FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "clinic_update_queue" ON public.pipeline_message_queue
  FOR UPDATE USING (clinic_id IN (SELECT clinic_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Add queue global rules
INSERT INTO public.pipeline_global_rules (rule_key, rule_value, description) VALUES
  ('queue_batch_size', '10', 'Mensajes procesados por ejecución'),
  ('queue_delay_between_sends_ms', '2000', 'Milisegundos entre cada envío (rate limit WhatsApp)'),
  ('queue_max_retry_attempts', '3', 'Intentos máximos antes de marcar como fallido'),
  ('queue_stagger_max_minutes', '30', 'Offset aleatorio máximo al reanudar a las 7 AM')
ON CONFLICT (rule_key) DO UPDATE SET rule_value = EXCLUDED.rule_value;

-- Enable realtime for queue status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_message_queue;
