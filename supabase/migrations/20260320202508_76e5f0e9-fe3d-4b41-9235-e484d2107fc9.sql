CREATE OR REPLACE FUNCTION public.set_inactivity_timer_on_outbound()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  conv RECORD;
  current_s INTEGER;
  next_s_val INTEGER;
BEGIN
  -- Set inactivity timer on outbound messages in resueltos_ia
  IF NEW.direction = 'outbound' THEN
    UPDATE conversations 
    SET inactivity_timer_start = NOW()
    WHERE id = NEW.conversation_id 
      AND pipeline_tab = 'resueltos_ia';
  END IF;
  
  -- Handle inbound messages: "nunca retrocede, siempre avanza"
  IF NEW.direction = 'inbound' THEN
    SELECT pipeline_tab, seguimiento_contact_number, seguimiento_last_completed_s, 
           seguimiento_next_s, seguimiento_is_recurrente, seguimiento_recurrente_count
    INTO conv
    FROM conversations
    WHERE id = NEW.conversation_id;

    IF conv.pipeline_tab LIKE 'seguimiento_s%' THEN
      current_s := COALESCE(conv.seguimiento_contact_number, 1);
      
      -- S1-S4 are automatic, S5-S6 are manual/human
      IF current_s BETWEEN 1 AND 4 THEN
        next_s_val := LEAST(current_s + 1, 7);
        UPDATE conversations SET
          pipeline_tab = 'resueltos_ia',
          seguimiento_responded_at_s = current_s,
          seguimiento_last_completed_s = current_s,
          seguimiento_next_s = next_s_val,
          seguimiento_is_recurrente = TRUE,
          seguimiento_recurrente_count = COALESCE(seguimiento_recurrente_count, 0) + 
            CASE WHEN COALESCE(seguimiento_is_recurrente, false) THEN 0 ELSE 1 END,
          seguimiento_contact_number = 0,
          seguimiento_next_contact_at = NULL,
          seguimiento_last_contact_at = NULL,
          inactivity_timer_start = NULL,
          follow_up_count = 0,
          seguimiento_consecutive_read_no_reply = 0,
          seguimiento_spam_protection_triggered = FALSE,
          seguimiento_spam_jumped_from_s = NULL
        WHERE id = NEW.conversation_id;
        
      ELSIF current_s IN (5, 6) THEN
        -- Manual steps: client responded, advance next_s (capped at 7)
        next_s_val := LEAST(GREATEST(COALESCE(conv.seguimiento_next_s, current_s), current_s + 1), 7);
        UPDATE conversations SET
          pipeline_tab = 'resueltos_ia',
          seguimiento_responded_at_s = current_s,
          seguimiento_last_completed_s = current_s,
          seguimiento_next_s = next_s_val,
          seguimiento_is_recurrente = TRUE,
          seguimiento_recurrente_count = COALESCE(seguimiento_recurrente_count, 0) + 1,
          seguimiento_contact_number = 0,
          seguimiento_next_contact_at = NULL,
          inactivity_timer_start = NULL,
          follow_up_count = 0,
          seguimiento_consecutive_read_no_reply = 0,
          seguimiento_spam_protection_triggered = FALSE,
          seguimiento_spam_jumped_from_s = NULL
        WHERE id = NEW.conversation_id;
      END IF;

    ELSIF conv.pipeline_tab = 'no_responden' OR conv.pipeline_tab = 'perdidos' THEN
      UPDATE conversations SET
        pipeline_tab = 'resueltos_ia',
        seguimiento_last_completed_s = 0,
        seguimiento_next_s = 1,
        seguimiento_responded_at_s = 0,
        seguimiento_is_recurrente = TRUE,
        seguimiento_recurrente_count = COALESCE(seguimiento_recurrente_count, 0) + 1,
        seguimiento_contact_number = 0,
        seguimiento_next_contact_at = NULL,
        seguimiento_last_contact_at = NULL,
        inactivity_timer_start = NULL,
        follow_up_count = 0,
        seguimiento_consecutive_read_no_reply = 0,
        seguimiento_spam_protection_triggered = FALSE,
        seguimiento_spam_jumped_from_s = NULL
      WHERE id = NEW.conversation_id;

    ELSIF conv.pipeline_tab = 'resueltos_ia' THEN
      UPDATE conversations SET
        inactivity_timer_start = NULL,
        seguimiento_consecutive_read_no_reply = 0
      WHERE id = NEW.conversation_id
        AND (inactivity_timer_start IS NOT NULL OR seguimiento_consecutive_read_no_reply > 0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$