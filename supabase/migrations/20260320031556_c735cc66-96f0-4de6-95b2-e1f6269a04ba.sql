
-- Add anti-spam columns to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS seguimiento_consecutive_read_no_reply INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguimiento_spam_protection_triggered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seguimiento_spam_jumped_from_s INTEGER;

-- Add delivery_status_updated_at to messages (status field already exists as 'status')
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivery_status_updated_at TIMESTAMPTZ;

-- Add spam protection rule to pipeline_global_rules
INSERT INTO pipeline_global_rules (rule_key, rule_value, description) VALUES
('spam_protection_read_no_reply_limit', '4', 'Cantidad de lecturas sin respuesta consecutivas antes de activar protección anti-spam y saltar a manual')
ON CONFLICT (rule_key) DO UPDATE SET rule_value = EXCLUDED.rule_value;
