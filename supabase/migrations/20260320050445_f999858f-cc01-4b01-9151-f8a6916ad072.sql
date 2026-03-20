ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS alternative_phone TEXT,
ADD COLUMN IF NOT EXISTS alternative_phone_label TEXT;