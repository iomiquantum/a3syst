-- Add price and observations fields to psycho_matrix_services
ALTER TABLE public.psycho_matrix_services
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS observations text DEFAULT '';
