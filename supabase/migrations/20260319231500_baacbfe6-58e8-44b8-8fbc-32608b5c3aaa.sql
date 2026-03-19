CREATE OR REPLACE FUNCTION public.set_inactivity_timer_on_outbound()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND pipeline_tab IN ('seguimiento_c1', 'seguimiento_c2', 'seguimiento_c3', 'seguimiento_c4', 'seguimiento_c5', 'no_responden');
  END IF;
  
  RETURN NEW;
END;
$function$;