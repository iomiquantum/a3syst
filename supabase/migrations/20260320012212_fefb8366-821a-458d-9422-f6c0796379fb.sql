
-- 1. Add new columns to conversations for WhatsApp 24h window tracking
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_client_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_window_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_window_blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_window_blocked_reason TEXT;

-- Populate last_client_message_at from existing inbound messages
UPDATE conversations c
SET last_client_message_at = (
  SELECT MAX(m.created_at)
  FROM messages m
  WHERE m.conversation_id = c.id
  AND m.direction = 'inbound'
)
WHERE c.last_client_message_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_last_client_msg ON conversations(last_client_message_at);

-- 2. Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_language TEXT DEFAULT 'es',
  template_body TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]',
  meta_template_id TEXT,
  meta_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, template_type)
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_anon_wa_templates" ON whatsapp_templates
  FOR ALL TO anon USING (false);

CREATE POLICY "clinic_members_manage_wa_templates" ON whatsapp_templates
  FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "super_admin_wa_templates" ON whatsapp_templates
  FOR ALL TO authenticated USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 3. Insert default templates for each clinic
INSERT INTO whatsapp_templates (clinic_id, template_name, template_type, template_body, template_variables)
SELECT c.id,
  'Seguimiento de consulta',
  'seguimiento_general',
  'Hola {{1}}, soy {{2}} de {{3}}. Queremos saber si todavía te interesa información sobre {{4}}. Responde a este mensaje y con gusto te ayudamos.',
  '["nombre_cliente", "nombre_agente", "nombre_negocio", "servicio_consultado"]'::JSONB
FROM clinics c ON CONFLICT (clinic_id, template_type) DO NOTHING;

INSERT INTO whatsapp_templates (clinic_id, template_name, template_type, template_body, template_variables)
SELECT c.id,
  'Recordatorio de cita',
  'recordatorio_cita',
  'Hola {{1}}, te recordamos tu cita en {{2}} para el {{3}} a las {{4}}. ¿Confirmas tu asistencia? Responde Sí o No.',
  '["nombre_cliente", "nombre_negocio", "fecha_cita", "hora_cita"]'::JSONB
FROM clinics c ON CONFLICT (clinic_id, template_type) DO NOTHING;

INSERT INTO whatsapp_templates (clinic_id, template_name, template_type, template_body, template_variables)
SELECT c.id,
  'Reactivación de contacto',
  'reactivacion',
  'Hola {{1}}, soy {{2}} de {{3}}. Hace un tiempo consultaste con nosotros y queríamos saber cómo estás. Si necesitas atención, responde a este mensaje y te ayudamos con gusto.',
  '["nombre_cliente", "nombre_agente", "nombre_negocio"]'::JSONB
FROM clinics c ON CONFLICT (clinic_id, template_type) DO NOTHING;

INSERT INTO whatsapp_templates (clinic_id, template_name, template_type, template_body, template_variables)
SELECT c.id,
  'Novedades y ofertas',
  'oferta_valor',
  'Hola {{1}}, en {{2}} tenemos novedades que te pueden interesar. Responde a este mensaje para conocer más.',
  '["nombre_cliente", "nombre_negocio"]'::JSONB
FROM clinics c ON CONFLICT (clinic_id, template_type) DO NOTHING;

-- 4. Update send window defaults to 7AM-11PM
UPDATE pipeline_global_rules SET rule_value = '7' WHERE rule_key = 'send_window_start_hour';
UPDATE pipeline_global_rules SET rule_value = '23' WHERE rule_key = 'send_window_end_hour';
