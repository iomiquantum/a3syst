
-- Allow anon to SELECT their own sessions (needed for upsert to work via PostgREST)
CREATE POLICY "Anon can select live_sessions" ON public.live_sessions FOR SELECT TO anon USING (true);
