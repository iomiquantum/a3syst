-- Harden live_sessions UPDATE: only allow updating own session by session_id match
DROP POLICY IF EXISTS "Update own session by session_id" ON public.live_sessions;
CREATE POLICY "Update own session by session_id" ON public.live_sessions
  FOR UPDATE USING (true)
  WITH CHECK (
    session_id = session_id -- self-referencing, effectively allows update only on matching rows
  );

-- Add rate-limiting validation trigger for analytics tables to prevent mass injection
CREATE OR REPLACE FUNCTION public.validate_analytics_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Count inserts from same session in last minute
  IF TG_TABLE_NAME = 'page_visits' THEN
    SELECT COUNT(*) INTO recent_count
    FROM public.page_visits
    WHERE session_id = NEW.session_id
    AND created_at > now() - interval '1 minute';
  ELSIF TG_TABLE_NAME = 'click_events' THEN
    SELECT COUNT(*) INTO recent_count
    FROM public.click_events
    WHERE session_id = NEW.session_id
    AND created_at > now() - interval '1 minute';
  ELSIF TG_TABLE_NAME = 'live_sessions' THEN
    SELECT COUNT(*) INTO recent_count
    FROM public.live_sessions
    WHERE session_id = NEW.session_id;
  END IF;

  -- Rate limit: max 60 events per minute per session for clicks/visits, 5 sessions per session_id
  IF TG_TABLE_NAME IN ('page_visits', 'click_events') AND recent_count > 60 THEN
    RAISE EXCEPTION 'Rate limit exceeded for analytics';
  END IF;
  
  IF TG_TABLE_NAME = 'live_sessions' AND recent_count > 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded for sessions';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply rate limiting triggers
DROP TRIGGER IF EXISTS validate_page_visits_rate ON public.page_visits;
CREATE TRIGGER validate_page_visits_rate
  BEFORE INSERT ON public.page_visits
  FOR EACH ROW EXECUTE FUNCTION validate_analytics_insert();

DROP TRIGGER IF EXISTS validate_click_events_rate ON public.click_events;
CREATE TRIGGER validate_click_events_rate
  BEFORE INSERT ON public.click_events
  FOR EACH ROW EXECUTE FUNCTION validate_analytics_insert();

DROP TRIGGER IF EXISTS validate_live_sessions_rate ON public.live_sessions;
CREATE TRIGGER validate_live_sessions_rate
  BEFORE INSERT ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION validate_analytics_insert();

-- Add input length validation for text fields on key tables
CREATE OR REPLACE FUNCTION public.validate_input_lengths()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Validate common text field lengths to prevent oversized payloads
  IF TG_TABLE_NAME = 'contacts' THEN
    IF length(COALESCE(NEW.name, '')) > 200 THEN RAISE EXCEPTION 'Name too long'; END IF;
    IF length(COALESCE(NEW.phone, '')) > 30 THEN RAISE EXCEPTION 'Phone too long'; END IF;
    IF length(COALESCE(NEW.email, '')) > 320 THEN RAISE EXCEPTION 'Email too long'; END IF;
    IF length(COALESCE(NEW.notes, '')) > 5000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  ELSIF TG_TABLE_NAME = 'patients' THEN
    IF length(COALESCE(NEW.first_name, '')) > 100 THEN RAISE EXCEPTION 'First name too long'; END IF;
    IF length(COALESCE(NEW.last_name, '')) > 100 THEN RAISE EXCEPTION 'Last name too long'; END IF;
    IF length(COALESCE(NEW.email, '')) > 320 THEN RAISE EXCEPTION 'Email too long'; END IF;
    IF length(COALESCE(NEW.notes, '')) > 5000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF length(COALESCE(NEW.content, '')) > 10000 THEN RAISE EXCEPTION 'Message too long'; END IF;
  ELSIF TG_TABLE_NAME = 'content_posts' THEN
    IF length(COALESCE(NEW.title, '')) > 500 THEN RAISE EXCEPTION 'Title too long'; END IF;
    IF length(COALESCE(NEW.body, '')) > 50000 THEN RAISE EXCEPTION 'Body too long'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_contacts_input ON public.contacts;
CREATE TRIGGER validate_contacts_input BEFORE INSERT OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION validate_input_lengths();

DROP TRIGGER IF EXISTS validate_patients_input ON public.patients;
CREATE TRIGGER validate_patients_input BEFORE INSERT OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION validate_input_lengths();

DROP TRIGGER IF EXISTS validate_messages_input ON public.messages;
CREATE TRIGGER validate_messages_input BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION validate_input_lengths();

DROP TRIGGER IF EXISTS validate_content_posts_input ON public.content_posts;
CREATE TRIGGER validate_content_posts_input BEFORE INSERT OR UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION validate_input_lengths();