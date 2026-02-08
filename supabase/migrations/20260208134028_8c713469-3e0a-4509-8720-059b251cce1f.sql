
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to auto-reply when chatbot is active
CREATE OR REPLACE FUNCTION public.handle_chatbot_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv_record RECORD;
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  -- Only process inbound messages
  IF NEW.direction != 'inbound' THEN
    RETURN NEW;
  END IF;

  -- Check if conversation has chatbot_active
  SELECT id, chatbot_active, clinic_id
  INTO conv_record
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF conv_record.chatbot_active = true THEN
    -- Call the ai-agent-reply edge function via pg_net
    PERFORM net.http_post(
      url := 'https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/ai-agent-reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZHNodnF4dmpiZWl6ZGl2cHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODUwMzMsImV4cCI6MjA4NjA2MTAzM30.xydBrdrfyexcJbhMwQPiBH-YZah3uiO7NevayvDW4Jo'
      ),
      body := jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'clinic_id', NEW.clinic_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
CREATE TRIGGER on_new_inbound_message_auto_reply
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_chatbot_auto_reply();
