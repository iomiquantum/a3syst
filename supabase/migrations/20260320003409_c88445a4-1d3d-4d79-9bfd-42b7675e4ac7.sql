
-- ==============================
-- PART 1: Rename C→S in conversations
-- ==============================
UPDATE conversations SET pipeline_tab = REPLACE(pipeline_tab, 'seguimiento_c', 'seguimiento_s') 
WHERE pipeline_tab LIKE 'seguimiento_c%';

UPDATE conversation_pipeline_history SET from_tab = REPLACE(from_tab, 'seguimiento_c', 'seguimiento_s')
WHERE from_tab LIKE 'seguimiento_c%';

UPDATE conversation_pipeline_history SET to_tab = REPLACE(to_tab, 'seguimiento_c', 'seguimiento_s')
WHERE to_tab LIKE 'seguimiento_c%';

-- Move legacy states
UPDATE conversations SET pipeline_tab = 'agendados' WHERE pipeline_tab = 'seguimiento_venta';
UPDATE conversations SET pipeline_tab = 'pacientes' WHERE pipeline_tab = 'clientes';

-- ==============================
-- PART 2: Add new tracking columns to conversations
-- ==============================
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS seguimiento_last_completed_s INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguimiento_next_s INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguimiento_responded_at_s INTEGER DEFAULT 0;

-- Initialize tracking fields for existing seguimiento conversations
UPDATE conversations 
SET seguimiento_last_completed_s = COALESCE(seguimiento_contact_number, 0),
    seguimiento_next_s = LEAST(COALESCE(seguimiento_contact_number, 0) + 1, 10)
WHERE pipeline_tab LIKE 'seguimiento_s%' AND (seguimiento_next_s = 0 OR seguimiento_next_s IS NULL);

-- ==============================
-- PART 3: Add timezone to clinics
-- ==============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Guayaquil';

-- ==============================
-- PART 4: Update seguimiento_auto_messages constraint
-- ==============================
ALTER TABLE seguimiento_auto_messages DROP CONSTRAINT IF EXISTS seguimiento_auto_messages_contact_number_check;
ALTER TABLE seguimiento_auto_messages ADD CONSTRAINT seguimiento_auto_messages_contact_number_check CHECK (contact_number BETWEEN 1 AND 10);

-- Update validate trigger for new range
CREATE OR REPLACE FUNCTION public.validate_seguimiento_contact_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contact_number < 1 OR NEW.contact_number > 10 THEN
    RAISE EXCEPTION 'contact_number must be between 1 and 10';
  END IF;
  RETURN NEW;
END;
$$;

-- ==============================
-- PART 5: Update global rules (new S delays + business hours)
-- ==============================
UPDATE pipeline_global_rules SET rule_value = '15' WHERE rule_key = 'inactivity_timeout_minutes';
UPDATE pipeline_global_rules SET rule_value = '10' WHERE rule_key = 'max_auto_contacts';

-- Delete old c_ delay rules
DELETE FROM pipeline_global_rules WHERE rule_key LIKE 'c%_delay_minutes';

-- Insert new s_ delay rules + business hours
INSERT INTO pipeline_global_rules (rule_key, rule_value, description) VALUES
('s1_delay_minutes', '15', 'Minutos de inactividad antes de S1'),
('s2_delay_minutes', '30', 'Minutos después de S1 para S2'),
('s3_delay_minutes', '30', 'Minutos después de S2 para S3'),
('s4_delay_minutes', '60', 'Minutos después de S3 para S4'),
('s5_delay_minutes', '120', 'Minutos después de S4 para S5'),
('s6_delay_minutes', '240', 'Minutos después de S5 para S6'),
('s7_delay_minutes', '720', 'Minutos después de S6 para S7'),
('s8_delay_minutes', '30', 'Minutos después de S7 para S8'),
('send_window_start_hour', '8', 'Hora inicio ventana de envío (8 AM)'),
('send_window_end_hour', '21', 'Hora fin ventana de envío (9 PM)')
ON CONFLICT (rule_key) DO UPDATE SET rule_value = EXCLUDED.rule_value, description = EXCLUDED.description;

-- ==============================
-- PART 6: Update seguimiento_auto_messages for all clinics (S1-S10)
-- ==============================
DELETE FROM seguimiento_auto_messages;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 1, 'CONTEXTUAL_AI_GENERATED', 15, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 2, 'CONTEXTUAL_AI_GENERATED', 30, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 3, 'CONTEXTUAL_AI_GENERATED', 30, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 4, 'CONTEXTUAL_AI_GENERATED', 60, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 5, 'CONTEXTUAL_AI_GENERATED', 120, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 6, 'CONTEXTUAL_AI_GENERATED', 240, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 7, 'CONTEXTUAL_AI_GENERATED', 720, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 8, 'CONTEXTUAL_AI_GENERATED', 30, true, true FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 9, 'MANUAL_AGENT', 0, true, false FROM clinics c;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 10, 'MANUAL_AGENT', 0, true, false FROM clinics c;

-- ==============================
-- PART 7: Update DB trigger for inbound messages (S1-S10 + never-retrocede)
-- ==============================
CREATE OR REPLACE FUNCTION public.set_inactivity_timer_on_outbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv RECORD;
  current_s INTEGER;
BEGIN
  -- Set inactivity timer on outbound messages in resueltos_ia
  IF NEW.direction = 'outbound' THEN
    UPDATE conversations 
    SET inactivity_timer_start = NOW()
    WHERE id = NEW.conversation_id 
      AND pipeline_tab = 'resueltos_ia';
  END IF;
  
  -- Handle inbound messages: "nunca retrocede, siempre avanza"
  IF NEW.direction = 'inbound' THEN
    SELECT pipeline_tab, seguimiento_contact_number, seguimiento_last_completed_s, 
           seguimiento_next_s, seguimiento_is_recurrente, seguimiento_recurrente_count
    INTO conv
    FROM conversations
    WHERE id = NEW.conversation_id;

    IF conv.pipeline_tab LIKE 'seguimiento_s%' THEN
      current_s := COALESCE(conv.seguimiento_contact_number, 1);
      
      IF current_s BETWEEN 1 AND 8 THEN
        -- Automatic stages: advance, never go back
        UPDATE conversations SET
          pipeline_tab = 'resueltos_ia',
          seguimiento_responded_at_s = current_s,
          seguimiento_last_completed_s = current_s,
          seguimiento_next_s = LEAST(current_s + 1, 11),
          seguimiento_is_recurrente = TRUE,
          seguimiento_recurrente_count = COALESCE(seguimiento_recurrente_count, 0) + 
            CASE WHEN COALESCE(seguimiento_is_recurrente, false) THEN 0 ELSE 1 END,
          seguimiento_contact_number = 0,
          seguimiento_next_contact_at = NULL,
          seguimiento_last_contact_at = NULL,
          inactivity_timer_start = NULL,
          follow_up_count = 0
        WHERE id = NEW.conversation_id;
        
      ELSIF current_s IN (9, 10) THEN
        -- Manual stages: go back to resueltos_ia, keep same next_s
        UPDATE conversations SET
          pipeline_tab = 'resueltos_ia',
          seguimiento_responded_at_s = current_s,
          seguimiento_next_s = current_s,
          seguimiento_contact_number = 0,
          seguimiento_next_contact_at = NULL,
          inactivity_timer_start = NULL,
          follow_up_count = 0
        WHERE id = NEW.conversation_id;
      END IF;

    ELSIF conv.pipeline_tab = 'no_responden' OR conv.pipeline_tab = 'perdidos' THEN
      -- Full restart from S1 as recurrente
      UPDATE conversations SET
        pipeline_tab = 'resueltos_ia',
        seguimiento_last_completed_s = 0,
        seguimiento_next_s = 1,
        seguimiento_responded_at_s = 0,
        seguimiento_is_recurrente = TRUE,
        seguimiento_recurrente_count = COALESCE(seguimiento_recurrente_count, 0) + 1,
        seguimiento_contact_number = 0,
        seguimiento_next_contact_at = NULL,
        seguimiento_last_contact_at = NULL,
        inactivity_timer_start = NULL,
        follow_up_count = 0
      WHERE id = NEW.conversation_id;

    ELSIF conv.pipeline_tab = 'resueltos_ia' THEN
      -- Reset timer if active
      UPDATE conversations SET
        inactivity_timer_start = NULL
      WHERE id = NEW.conversation_id
        AND inactivity_timer_start IS NOT NULL;
    END IF;
    -- Sticky states (no_interesado, escalados, agendados, etc.) → no movement
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Initialize appointment_status for existing agendados
UPDATE conversations SET appointment_status = 'agendado' 
WHERE pipeline_tab = 'agendados' AND appointment_status IS NULL;

-- Delete old clinic pipeline rules referencing c_ delays
DELETE FROM clinic_pipeline_rules WHERE rule_key LIKE 'c%_delay_minutes';
