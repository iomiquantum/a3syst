
CREATE TABLE public.user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, consent_type, version)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to user_consents"
  ON public.user_consents FOR ALL
  USING (false);

CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admin can manage all user_consents"
  ON public.user_consents FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
