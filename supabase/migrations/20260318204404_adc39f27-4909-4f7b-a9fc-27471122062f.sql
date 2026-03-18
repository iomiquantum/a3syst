
-- 1. Add missing columns to whatsapp_connections
ALTER TABLE public.whatsapp_connections 
  ADD COLUMN IF NOT EXISTS meta_app_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_app_name TEXT,
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS webhook_configured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_connections_phone_number_id_key') THEN
    ALTER TABLE public.whatsapp_connections ADD CONSTRAINT whatsapp_connections_phone_number_id_key UNIQUE(phone_number_id);
  END IF;
END $$;

-- 2. Create whatsapp_conversations table
CREATE TABLE public.whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_wa_id TEXT,
  status TEXT DEFAULT 'open',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  assigned_to UUID,
  patient_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, contact_phone)
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon whatsapp_conversations" ON public.whatsapp_conversations
  FOR ALL TO anon USING (false);
CREATE POLICY "Clinic members can manage whatsapp_conversations" ON public.whatsapp_conversations
  FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin whatsapp_conversations" ON public.whatsapp_conversations
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_wa_conversations_clinic ON public.whatsapp_conversations(clinic_id, last_message_at DESC);
CREATE INDEX idx_wa_conversations_connection ON public.whatsapp_conversations(connection_id);

-- 3. Add missing columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS media_caption TEXT,
  ADD COLUMN IF NOT EXISTS status_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS sent_by UUID,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_connections_clinic ON public.whatsapp_connections(clinic_id);

-- 4. Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wa_connections_updated_at') THEN
    CREATE TRIGGER update_wa_connections_updated_at BEFORE UPDATE ON public.whatsapp_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wa_conversations_updated_at') THEN
    CREATE TRIGGER update_wa_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 5. Realtime - only add whatsapp_conversations (whatsapp_messages already in publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
