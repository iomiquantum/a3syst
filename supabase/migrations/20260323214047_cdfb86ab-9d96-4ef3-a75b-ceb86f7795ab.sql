ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS working_schedule jsonb DEFAULT '{
  "lunes": {"enabled": true, "open": "09:00", "close": "18:00"},
  "martes": {"enabled": true, "open": "09:00", "close": "18:00"},
  "miercoles": {"enabled": true, "open": "09:00", "close": "18:00"},
  "jueves": {"enabled": true, "open": "09:00", "close": "18:00"},
  "viernes": {"enabled": true, "open": "09:00", "close": "18:00"},
  "sabado": {"enabled": false, "open": "09:00", "close": "14:00"},
  "domingo": {"enabled": false, "open": "09:00", "close": "14:00"}
}'::jsonb;