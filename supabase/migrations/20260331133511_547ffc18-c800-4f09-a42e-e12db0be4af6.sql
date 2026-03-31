-- Drop the trigger that automatically moves conversations between pipeline stages
-- This is part of the "manual funnel" transition — no auto-movements allowed
DROP TRIGGER IF EXISTS on_whatsapp_message_auto_reply ON public.whatsapp_messages;
DROP FUNCTION IF EXISTS public.set_inactivity_timer_on_outbound() CASCADE;