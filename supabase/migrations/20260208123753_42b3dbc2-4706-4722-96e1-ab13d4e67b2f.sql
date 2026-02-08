
-- Contacts table (separate from patients, for WhatsApp/marketing)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  source TEXT DEFAULT 'whatsapp',
  funnel_stage TEXT NOT NULL DEFAULT 'nuevos',
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  location TEXT DEFAULT '',
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to contacts" ON public.contacts AS RESTRICTIVE FOR ALL USING (false);
CREATE POLICY "Clinic members can view contacts" ON public.contacts AS RESTRICTIVE FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage contacts" ON public.contacts AS RESTRICTIVE FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin can manage all contacts" ON public.contacts AS RESTRICTIVE FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_contacts_clinic ON public.contacts(clinic_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT DEFAULT '',
  unread_count INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES public.profiles(user_id),
  chatbot_active BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to conversations" ON public.conversations AS RESTRICTIVE FOR ALL USING (false);
CREATE POLICY "Clinic members can view conversations" ON public.conversations AS RESTRICTIVE FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage conversations" ON public.conversations AS RESTRICTIVE FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin can manage all conversations" ON public.conversations AS RESTRICTIVE FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_conversations_clinic ON public.conversations(clinic_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'inbound',
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  whatsapp_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to messages" ON public.messages AS RESTRICTIVE FOR ALL USING (false);
CREATE POLICY "Clinic members can view messages" ON public.messages AS RESTRICTIVE FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage messages" ON public.messages AS RESTRICTIVE FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin can manage all messages" ON public.messages AS RESTRICTIVE FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Update trigger for contacts
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
