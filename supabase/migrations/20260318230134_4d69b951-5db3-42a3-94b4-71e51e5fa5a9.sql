
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS follow_up_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_inbound_at timestamp with time zone DEFAULT NULL;

-- Backfill last_inbound_at from existing messages
UPDATE public.conversations c
SET last_inbound_at = sub.last_in
FROM (
  SELECT conversation_id, MAX(created_at) as last_in
  FROM public.messages
  WHERE direction = 'inbound'
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id AND c.last_inbound_at IS NULL;
