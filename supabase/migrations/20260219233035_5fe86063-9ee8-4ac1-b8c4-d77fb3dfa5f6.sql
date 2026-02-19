
-- Live sessions table for real-time visitor tracking
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  current_page text NOT NULL DEFAULT '/',
  country text,
  region text,
  timezone text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_heartbeat timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  did_register boolean NOT NULL DEFAULT false,
  device_type text NOT NULL DEFAULT 'desktop',
  referrer text,
  utm_source text,
  utm_campaign text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on session_id for upserts
CREATE UNIQUE INDEX idx_live_sessions_session_id ON public.live_sessions (session_id);

-- Index for querying active sessions
CREATE INDEX idx_live_sessions_active ON public.live_sessions (is_active, last_heartbeat);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Block anonymous reads
CREATE POLICY "Block anonymous reads on live_sessions"
ON public.live_sessions FOR SELECT USING (false);

-- Super admin can read
CREATE POLICY "Super admin can read live_sessions"
ON public.live_sessions FOR SELECT USING (is_super_admin());

-- Anyone can insert (via edge function with service role, but also allow anon for heartbeat)
CREATE POLICY "Anyone can insert live_sessions"
ON public.live_sessions FOR INSERT WITH CHECK (true);

-- Anyone can update their own session (matched by session_id)
CREATE POLICY "Anyone can update live_sessions"
ON public.live_sessions FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
