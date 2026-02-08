
-- Call logs table to track phone calls made to contacts
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  logged_by UUID REFERENCES auth.users(id),
  call_type TEXT NOT NULL DEFAULT 'outbound', -- outbound, inbound
  duration_seconds INTEGER DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'sin_respuesta', -- contestada, sin_respuesta, buzon, ocupado, callback
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to call_logs"
  ON public.call_logs FOR ALL USING (false);

CREATE POLICY "Clinic members can view call_logs"
  ON public.call_logs FOR SELECT
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can manage call_logs"
  ON public.call_logs FOR ALL
  USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all call_logs"
  ON public.call_logs FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE INDEX idx_call_logs_contact ON public.call_logs(contact_id);
CREATE INDEX idx_call_logs_clinic ON public.call_logs(clinic_id);
