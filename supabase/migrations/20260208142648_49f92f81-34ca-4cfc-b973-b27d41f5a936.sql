-- Remove the duplicate trigger
DROP TRIGGER IF EXISTS on_new_inbound_message_auto_reply ON public.messages;