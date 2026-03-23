
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS working_schedule jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS email text DEFAULT null,
  ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT null;
