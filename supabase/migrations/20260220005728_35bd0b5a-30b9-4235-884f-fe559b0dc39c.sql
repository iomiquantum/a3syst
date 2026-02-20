
-- Fix the trigger to reject sessions without device_id
CREATE OR REPLACE FUNCTION public.assign_device_number()
RETURNS TRIGGER AS $$
DECLARE
  existing_number integer;
BEGIN
  -- Require device_id
  IF NEW.device_id IS NULL OR NEW.device_id = '' THEN
    -- Assign a temporary number but don't waste sequence
    NEW.device_number := 0;
    RETURN NEW;
  END IF;

  -- Check if this device_id already has a number
  SELECT device_number INTO existing_number
  FROM public.live_sessions
  WHERE device_id = NEW.device_id AND device_number > 0
  LIMIT 1;
  
  IF existing_number IS NOT NULL THEN
    NEW.device_number := existing_number;
  ELSE
    NEW.device_number := nextval('public.live_sessions_device_number_seq');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
