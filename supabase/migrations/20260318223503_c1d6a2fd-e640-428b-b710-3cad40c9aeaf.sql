ALTER TABLE public.ai_agent_config 
ADD COLUMN IF NOT EXISTS treatments_text text DEFAULT '',
ADD COLUMN IF NOT EXISTS prices_text text DEFAULT '',
ADD COLUMN IF NOT EXISTS locations_text text DEFAULT '',
ADD COLUMN IF NOT EXISTS professionals_text text DEFAULT '';