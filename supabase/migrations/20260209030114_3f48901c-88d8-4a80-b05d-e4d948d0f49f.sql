
-- Add user_id and cost tracking to ai_token_usage
ALTER TABLE public.ai_token_usage
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN cost_usd NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN action_label TEXT NOT NULL DEFAULT '';

-- Index for per-user queries
CREATE INDEX idx_ai_token_usage_user ON public.ai_token_usage (user_id, created_at DESC);
