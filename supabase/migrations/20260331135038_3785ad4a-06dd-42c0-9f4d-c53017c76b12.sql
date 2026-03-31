-- Fix all conversations that were auto-escalated by the old appointment flow
-- and left with chatbot_active = false
UPDATE public.conversations
SET
  chatbot_active = true,
  escalado_at = NULL,
  escalado_reason = NULL,
  appointment_flow_active = false,
  appointment_flow_step = NULL,
  appointment_flow_data = '{}'::jsonb
WHERE chatbot_active = false
  AND escalado_reason IS NOT NULL
  AND escalado_reason LIKE '%flujo de agendamiento%';

-- Also clean up any stale appointment_flow_active flags
UPDATE public.conversations
SET
  appointment_flow_active = false,
  appointment_flow_step = NULL,
  appointment_flow_data = '{}'::jsonb
WHERE appointment_flow_active = true
  AND pipeline_tab != 'agendado';