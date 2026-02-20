-- Add a sequential device number column
ALTER TABLE public.live_sessions ADD COLUMN device_number serial;