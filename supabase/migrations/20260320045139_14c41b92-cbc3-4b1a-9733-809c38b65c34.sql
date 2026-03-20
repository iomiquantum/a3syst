
-- 1. Add appointment flow columns to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS appointment_flow_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appointment_flow_step TEXT,
ADD COLUMN IF NOT EXISTS appointment_flow_data JSONB DEFAULT '{}';

-- 2. Create clinic_services table
CREATE TABLE IF NOT EXISTS public.clinic_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS for clinic_services
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_manage_services" ON public.clinic_services
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM public.user_roles WHERE user_id = auth.uid())
    OR public.is_super_admin()
  );

-- 4. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic_id ON public.clinic_services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_appointment_flow ON public.conversations(appointment_flow_active) WHERE appointment_flow_active = TRUE;
