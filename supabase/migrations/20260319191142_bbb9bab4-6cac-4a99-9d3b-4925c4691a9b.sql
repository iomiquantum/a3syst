
-- 1.1 Extend conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS pipeline_tab TEXT DEFAULT 'resueltos_ia',
ADD COLUMN IF NOT EXISTS seguimiento_contact_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguimiento_next_contact_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seguimiento_last_contact_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seguimiento_is_recurrente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seguimiento_recurrente_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inactivity_timer_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marked_no_interesado_by UUID,
ADD COLUMN IF NOT EXISTS marked_no_interesado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marked_cliente_by UUID,
ADD COLUMN IF NOT EXISTS marked_cliente_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalado_reason TEXT,
ADD COLUMN IF NOT EXISTS escalado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pipeline_template_id UUID;

CREATE INDEX IF NOT EXISTS idx_conv_pipeline_tab ON conversations(clinic_id, pipeline_tab);
CREATE INDEX IF NOT EXISTS idx_conv_seg_next ON conversations(seguimiento_next_contact_at) WHERE pipeline_tab LIKE 'seguimiento_%';
CREATE INDEX IF NOT EXISTS idx_conv_inactivity ON conversations(inactivity_timer_start) WHERE pipeline_tab = 'resueltos_ia';

-- 1.2 Pipeline history table
CREATE TABLE IF NOT EXISTS conversation_pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  from_tab TEXT,
  to_tab TEXT NOT NULL,
  moved_by TEXT NOT NULL DEFAULT 'system',
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_conversation ON conversation_pipeline_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ph_clinic ON conversation_pipeline_history(clinic_id, created_at DESC);

-- 1.3 Seguimiento auto messages
CREATE TABLE IF NOT EXISTS seguimiento_auto_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  contact_number INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_automatic BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, contact_number)
);

CREATE OR REPLACE FUNCTION public.validate_seguimiento_contact_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.contact_number < 1 OR NEW.contact_number > 5 THEN
    RAISE EXCEPTION 'contact_number must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_seguimiento_contact_number
  BEFORE INSERT OR UPDATE ON seguimiento_auto_messages
  FOR EACH ROW EXECUTE FUNCTION validate_seguimiento_contact_number();

-- 1.4 Pipeline global rules
CREATE TABLE IF NOT EXISTS pipeline_global_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  rule_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pipeline_global_rules (rule_key, rule_value, description) VALUES
('inactivity_timeout_minutes', '30', 'Minutos de inactividad tras respuesta IA antes de pasar a C1'),
('c1_delay_minutes', '60', 'Minutos después de inactividad para enviar C1'),
('c2_delay_minutes', '240', 'Minutos después de C1 para enviar C2'),
('c3_delay_minutes', '720', 'Minutos después de C2 para enviar C3'),
('max_auto_contacts', '3', 'Cantidad de contactos automáticos antes de mover a No responden'),
('recurrente_max_cycles', '0', '0 = ciclos ilimitados de seguimiento recurrente')
ON CONFLICT (rule_key) DO NOTHING;

-- 1.5 Clinic pipeline rules
CREATE TABLE IF NOT EXISTS clinic_pipeline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_clinic_rules ON clinic_pipeline_rules(clinic_id);

-- 1.6 Pipeline templates
CREATE TABLE IF NOT EXISTS pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  industry_type TEXT NOT NULL,
  base_tabs JSONB NOT NULL DEFAULT '[]',
  extra_labels JSONB DEFAULT '[]',
  seguimiento_config JSONB DEFAULT '{}',
  automation_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_pipeline_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE UNIQUE,
  pipeline_template_id UUID REFERENCES pipeline_templates(id),
  custom_overrides JSONB DEFAULT '{}',
  loaded_at TIMESTAMPTZ DEFAULT NOW(),
  loaded_by UUID
);

-- 1.7 RLS
ALTER TABLE conversation_pipeline_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_members_read_ph" ON conversation_pipeline_history
  FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "clinic_members_insert_ph" ON conversation_pipeline_history
  FOR INSERT TO authenticated WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "super_admin_ph" ON conversation_pipeline_history
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_ph" ON conversation_pipeline_history
  FOR ALL TO anon USING (false);

ALTER TABLE seguimiento_auto_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_members_sam" ON seguimiento_auto_messages
  FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "super_admin_sam" ON seguimiento_auto_messages
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_sam" ON seguimiento_auto_messages
  FOR ALL TO anon USING (false);

ALTER TABLE pipeline_global_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_global_rules" ON pipeline_global_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "super_admin_global_rules" ON pipeline_global_rules
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_global_rules" ON pipeline_global_rules
  FOR ALL TO anon USING (false);

ALTER TABLE clinic_pipeline_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_members_cpr" ON clinic_pipeline_rules
  FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "super_admin_cpr" ON clinic_pipeline_rules
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_cpr" ON clinic_pipeline_rules
  FOR ALL TO anon USING (false);

ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_templates" ON pipeline_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "super_admin_templates" ON pipeline_templates
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_templates" ON pipeline_templates
  FOR ALL TO anon USING (false);

ALTER TABLE clinic_pipeline_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_members_cpc" ON clinic_pipeline_config
  FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "super_admin_cpc" ON clinic_pipeline_config
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "block_anon_cpc" ON clinic_pipeline_config
  FOR ALL TO anon USING (false);

-- 1.8 Migrate existing conversations
UPDATE conversations SET pipeline_tab = 'resueltos_ia' WHERE pipeline_tab IS NULL OR pipeline_tab = '';
UPDATE conversations SET pipeline_tab = 'escalados' WHERE status = 'escalated' AND (pipeline_tab IS NULL OR pipeline_tab = '' OR pipeline_tab = 'resueltos_ia');
