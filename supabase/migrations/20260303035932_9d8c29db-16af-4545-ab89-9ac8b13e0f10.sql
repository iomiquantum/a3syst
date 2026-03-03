
-- Add new columns for conversational onboarding
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#6366f1';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#f0f0ff';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS additional_info text DEFAULT '';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_method text;
