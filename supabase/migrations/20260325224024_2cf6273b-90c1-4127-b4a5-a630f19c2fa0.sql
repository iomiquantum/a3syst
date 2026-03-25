
-- Table: project_phases
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  phase_number INTEGER NOT NULL,
  color TEXT DEFAULT '#8b5cf6',
  icon TEXT DEFAULT 'folder',
  target_start_date DATE,
  target_end_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation trigger for project_phases status
CREATE OR REPLACE FUNCTION public.validate_phase_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'blocked') THEN
    RAISE EXCEPTION 'Invalid phase status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_phase_status
BEFORE INSERT OR UPDATE ON public.project_phases
FOR EACH ROW EXECUTE FUNCTION public.validate_phase_status();

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage phases"
ON public.project_phases FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
);

-- Table: project_tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  depends_on UUID REFERENCES public.project_tasks(id),
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  lovable_prompt_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation trigger for project_tasks status and priority
CREATE OR REPLACE FUNCTION public.validate_task_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'blocked', 'testing') THEN
    RAISE EXCEPTION 'Invalid task status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('critical', 'high', 'medium', 'low') THEN
    RAISE EXCEPTION 'Invalid task priority: %', NEW.priority;
  END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  IF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_task_fields
BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_task_fields();

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tasks"
ON public.project_tasks FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
);

-- Table: project_task_notes
CREATE TABLE IF NOT EXISTS public.project_task_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id UUID,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'comment',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_note_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.note_type NOT IN ('comment', 'status_change', 'ai_suggestion', 'blocker', 'decision') THEN
    RAISE EXCEPTION 'Invalid note type: %', NEW.note_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_note_type
BEFORE INSERT OR UPDATE ON public.project_task_notes
FOR EACH ROW EXECUTE FUNCTION public.validate_note_type();

ALTER TABLE public.project_task_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage task notes"
ON public.project_task_notes FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
);

-- Seed phases
INSERT INTO public.project_phases (name, description, phase_number, color, status) VALUES
('Fundamentos Críticos', 'Seguridad, Meta App Review, planificación de migración', 0, '#ef4444', 'in_progress'),
('Monetización — Pagos y Suscripciones', 'Integración PayPhone para suscripciones y cobros de clínicas', 1, '#f59e0b', 'pending'),
('WhatsApp Escalable', 'Multi-número, provisioning de números, modo compartido', 2, '#22c55e', 'pending'),
('Experiencia World-Class', 'PWA, reportes, onboarding, Google Calendar', 3, '#3b82f6', 'pending'),
('Inteligencia y Diferenciación', 'Lead scoring, A/B testing, dashboard IA, multi-canal', 4, '#8b5cf6', 'pending'),
('Escalabilidad y Enterprise', 'API pública, white-label, marketplace, compliance', 5, '#ec4899', 'pending'),
('Expansión', 'TikTok, Calling API, internacionalización, app nativa', 6, '#06b6d4', 'pending');
