CREATE TABLE IF NOT EXISTS public.chat_training_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  created_by UUID,
  feedback_text TEXT NOT NULL,
  ai_analysis TEXT,
  feedback_type TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_training_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage training feedback for their clinic"
ON public.chat_training_feedback
FOR ALL TO authenticated
USING (
  clinic_id IN (
    SELECT c.id FROM public.clinics c WHERE c.owner_id = auth.uid()
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT c.id FROM public.clinics c WHERE c.owner_id = auth.uid()
  )
);