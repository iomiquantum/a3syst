
-- ============================================
-- MEETINGS MODULE SCHEMA
-- ============================================

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Reunión sin título',
  meeting_url TEXT,
  platform TEXT NOT NULL DEFAULT 'google_meet',
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon meetings" ON public.meetings FOR ALL USING (false);
CREATE POLICY "Clinic members can view meetings" ON public.meetings FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage meetings" ON public.meetings FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin meetings" ON public.meetings FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting bots table (Recall.ai tracking)
CREATE TABLE public.meeting_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  bot_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  join_url TEXT,
  recording_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon meeting_bots" ON public.meeting_bots FOR ALL USING (false);
CREATE POLICY "Clinic members can view meeting_bots" ON public.meeting_bots FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage meeting_bots" ON public.meeting_bots FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin meeting_bots" ON public.meeting_bots FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_meeting_bots_updated_at BEFORE UPDATE ON public.meeting_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transcripts table
CREATE TABLE public.meeting_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE UNIQUE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  raw_transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'es',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon meeting_transcripts" ON public.meeting_transcripts FOR ALL USING (false);
CREATE POLICY "Clinic members can view meeting_transcripts" ON public.meeting_transcripts FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage meeting_transcripts" ON public.meeting_transcripts FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin meeting_transcripts" ON public.meeting_transcripts FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Summaries table
CREATE TABLE public.meeting_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE UNIQUE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  executive_summary TEXT,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment TEXT DEFAULT 'neutral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon meeting_summaries" ON public.meeting_summaries FOR ALL USING (false);
CREATE POLICY "Clinic members can view meeting_summaries" ON public.meeting_summaries FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage meeting_summaries" ON public.meeting_summaries FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin meeting_summaries" ON public.meeting_summaries FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER update_meeting_summaries_updated_at BEFORE UPDATE ON public.meeting_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
