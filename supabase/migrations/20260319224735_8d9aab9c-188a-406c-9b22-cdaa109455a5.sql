
-- Add appointment columns to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_time TEXT,
ADD COLUMN IF NOT EXISTS appointment_service TEXT,
ADD COLUMN IF NOT EXISTS appointment_branch_id UUID REFERENCES branches(id),
ADD COLUMN IF NOT EXISTS appointment_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS appointment_reminder_1_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appointment_reminder_1_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_reminder_2_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appointment_reminder_2_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appointment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_confirmation_message_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appointment_attended BOOLEAN,
ADD COLUMN IF NOT EXISTS appointment_attended_marked_by UUID,
ADD COLUMN IF NOT EXISTS appointment_attended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_had_sale BOOLEAN,
ADD COLUMN IF NOT EXISTS appointment_sale_marked_by UUID,
ADD COLUMN IF NOT EXISTS appointment_sale_marked_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_appointment_date ON conversations(appointment_date) WHERE pipeline_tab = 'agendados';
CREATE INDEX IF NOT EXISTS idx_conv_appointment_status ON conversations(clinic_id, appointment_status) WHERE pipeline_tab = 'agendados';

-- Add branch fields
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS arrival_instructions TEXT,
ADD COLUMN IF NOT EXISTS preparation_notes TEXT;

-- Reminder config table
CREATE TABLE IF NOT EXISTS appointment_reminder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  reminder_number INTEGER NOT NULL,
  hours_before_appointment INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(clinic_id, reminder_number)
);

ALTER TABLE appointment_reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_reminders" ON appointment_reminder_config
  FOR ALL TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "super_admin_reminders" ON appointment_reminder_config
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "block_anon_reminders" ON appointment_reminder_config
  FOR ALL TO anon
  USING (false);

-- Confirmation config table
CREATE TABLE IF NOT EXISTS appointment_confirmation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE UNIQUE,
  confirmation_message_template TEXT NOT NULL DEFAULT 'Perfecto {{nombre}}, tu cita queda confirmada para el {{fecha}} a las {{hora}} en {{sucursal}}. Dirección: {{direccion}}. {{indicaciones}} {{maps_link}} ¡Te esperamos!',
  include_google_maps_link BOOLEAN DEFAULT TRUE,
  include_preparation_notes BOOLEAN DEFAULT TRUE
);

ALTER TABLE appointment_confirmation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_confirmation" ON appointment_confirmation_config
  FOR ALL TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "super_admin_confirmation" ON appointment_confirmation_config
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "block_anon_confirmation" ON appointment_confirmation_config
  FOR ALL TO anon
  USING (false);

-- Insert defaults for existing clinics
INSERT INTO appointment_reminder_config (clinic_id, reminder_number, hours_before_appointment, message_template)
SELECT c.id, 1, 24,
  'Hola {{nombre}}, te recordamos que tienes cita mañana {{fecha}} a las {{hora}} para {{servicio}}. ¿Confirmas tu asistencia? Responde Sí o No.'
FROM clinics c ON CONFLICT (clinic_id, reminder_number) DO NOTHING;

INSERT INTO appointment_reminder_config (clinic_id, reminder_number, hours_before_appointment, message_template)
SELECT c.id, 2, 3,
  'Hola {{nombre}}, tu cita es hoy a las {{hora}} para {{servicio}}. ¿Podrás asistir? Si necesitas reagendar, avísanos.'
FROM clinics c ON CONFLICT (clinic_id, reminder_number) DO NOTHING;

INSERT INTO appointment_confirmation_config (clinic_id, confirmation_message_template)
SELECT c.id,
  'Perfecto {{nombre}}, tu cita queda confirmada para el {{fecha}} a las {{hora}} en {{sucursal}}. Dirección: {{direccion}}. {{indicaciones}} {{maps_link}} ¡Te esperamos!'
FROM clinics c ON CONFLICT (clinic_id) DO NOTHING;
