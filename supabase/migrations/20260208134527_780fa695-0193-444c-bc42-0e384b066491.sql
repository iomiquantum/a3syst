
-- Update the auto-reply trigger function to pass triggered_by = 'auto'
CREATE OR REPLACE FUNCTION public.handle_chatbot_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv_record RECORD;
BEGIN
  IF NEW.direction != 'inbound' THEN
    RETURN NEW;
  END IF;

  SELECT id, chatbot_active, clinic_id
  INTO conv_record
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF conv_record.chatbot_active = true THEN
    PERFORM net.http_post(
      url := 'https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/ai-agent-reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZHNodnF4dmpiZWl6ZGl2cHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODUwMzMsImV4cCI6MjA4NjA2MTAzM30.xydBrdrfyexcJbhMwQPiBH-YZah3uiO7NevayvDW4Jo'
      ),
      body := jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'clinic_id', NEW.clinic_id,
        'triggered_by', 'auto'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
