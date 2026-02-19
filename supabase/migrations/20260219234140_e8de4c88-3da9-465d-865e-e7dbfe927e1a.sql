
-- Add unique constraint on session_id for upserts to work
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_session_id_key UNIQUE (session_id);
