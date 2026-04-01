-- Blocked days table for agenda
CREATE TABLE public.blocked_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text DEFAULT '',
  blocked_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, date)
);

ALTER TABLE public.blocked_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocked days for their clinic" ON public.blocked_days
  FOR SELECT TO authenticated
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage blocked days" ON public.blocked_days
  FOR ALL TO authenticated
  USING (public.user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (public.user_has_clinic_access(auth.uid(), clinic_id));

-- Patient medical history fields
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS chronic_conditions text,
  ADD COLUMN IF NOT EXISTS current_medications text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_number text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS occupation text;

-- Clinical notes table for ongoing patient records (SOAP format)
CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id),
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  subjective text DEFAULT '',
  objective text DEFAULT '',
  assessment text DEFAULT '',
  plan text DEFAULT '',
  vitals jsonb DEFAULT '{}',
  attachments text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinical notes for their clinic" ON public.clinical_notes
  FOR SELECT TO authenticated
  USING (public.user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Users can manage clinical notes for their clinic" ON public.clinical_notes
  FOR ALL TO authenticated
  USING (public.user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (public.user_has_clinic_access(auth.uid(), clinic_id));