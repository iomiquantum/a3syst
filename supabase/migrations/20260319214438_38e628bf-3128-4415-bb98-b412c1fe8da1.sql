-- Trigger to automatically set inactivity_timer_start when an outbound message is inserted
-- and the conversation is in resueltos_ia
CREATE OR REPLACE FUNCTION public.set_inactivity_timer_on_outbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.direction = 'outbound' THEN
    UPDATE conversations 
    SET inactivity_timer_start = NOW()
    WHERE id = NEW.conversation_id 
      AND pipeline_tab = 'resueltos_ia';
  END IF;
  
  -- Reset pipeline to resueltos_ia when inbound message arrives (customer responded)
  IF NEW.direction = 'inbound' THEN
    UPDATE conversations 
    SET 
      pipeline_tab = 'resueltos_ia',
      inactivity_timer_start = NULL,
      seguimiento_contact_number = 0,
      seguimiento_next_contact_at = NULL,
      seguimiento_last_contact_at = NULL,
      follow_up_count = 0
    WHERE id = NEW.conversation_id 
      AND pipeline_tab IN ('seguimiento_c1', 'seguimiento_c2', 'seguimiento_c3', 'no_responden');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_set_inactivity_timer ON messages;
CREATE TRIGGER trg_set_inactivity_timer
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_inactivity_timer_on_outbound();