
-- 1. Wipe all data
DELETE FROM public.live_sessions;
SELECT setval('public.live_sessions_device_number_seq', 1, false);

-- 2. Add device_id column
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS device_id text;

-- 3. Remove auto-sequence default from device_number (trigger will handle it)
ALTER TABLE public.live_sessions ALTER COLUMN device_number DROP DEFAULT;

-- 4. Create trigger to assign device_number per unique device_id
CREATE OR REPLACE FUNCTION public.assign_device_number()
RETURNS TRIGGER AS $$
DECLARE
  existing_number integer;
BEGIN
  IF NEW.device_id IS NOT NULL THEN
    SELECT device_number INTO existing_number
    FROM public.live_sessions
    WHERE device_id = NEW.device_id
    LIMIT 1;
    
    IF existing_number IS NOT NULL THEN
      NEW.device_number := existing_number;
    ELSE
      NEW.device_number := nextval('public.live_sessions_device_number_seq');
    END IF;
  ELSE
    NEW.device_number := nextval('public.live_sessions_device_number_seq');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_device_number ON public.live_sessions;
CREATE TRIGGER set_device_number
BEFORE INSERT ON public.live_sessions
FOR EACH ROW
EXECUTE FUNCTION public.assign_device_number();
