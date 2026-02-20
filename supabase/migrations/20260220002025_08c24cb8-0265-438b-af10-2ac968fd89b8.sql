ALTER TABLE public.live_sessions
ADD COLUMN os text DEFAULT NULL,
ADD COLUMN browser text DEFAULT NULL;