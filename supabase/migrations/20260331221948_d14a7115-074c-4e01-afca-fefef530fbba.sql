-- Phase 1: UNIQUE constraint on contacts(clinic_id, phone) to prevent duplicates
-- First, handle existing duplicates by keeping the most recent one
DELETE FROM public.contacts a
USING public.contacts b
WHERE a.clinic_id = b.clinic_id
  AND a.phone = b.phone
  AND a.created_at < b.created_at;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_clinic_phone_unique UNIQUE (clinic_id, phone);

-- Phase 2: Composite index for messages (conversation_id + created_at) for faster chat loading
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages (conversation_id, created_at ASC);

-- Index for messages by clinic_id for realtime filtering
CREATE INDEX IF NOT EXISTS idx_messages_clinic
  ON public.messages (clinic_id);

-- Composite index for conversations list query pattern
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_archived_last_msg
  ON public.conversations (clinic_id, archived, last_message_at DESC);

-- Index for whatsapp_message_id lookups (status updates)
CREATE INDEX IF NOT EXISTS idx_messages_wa_msg_id
  ON public.messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Index for contacts search by name
CREATE INDEX IF NOT EXISTS idx_contacts_clinic_name
  ON public.contacts (clinic_id, name);