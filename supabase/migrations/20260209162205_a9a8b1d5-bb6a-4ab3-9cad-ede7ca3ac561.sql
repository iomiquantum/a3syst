
-- Projects table
CREATE TABLE public.planning_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom board columns per project
CREATE TABLE public.planning_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.planning_projects(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.planning_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.planning_projects(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.planning_columns(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  created_by UUID NOT NULL,
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries for employee tracking
CREATE TABLE public.planning_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planning_tasks(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Screenshots during time tracking
CREATE TABLE public.planning_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.planning_time_entries(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  capture_type TEXT NOT NULL DEFAULT 'tab',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_planning_tasks_project ON public.planning_tasks(project_id);
CREATE INDEX idx_planning_tasks_column ON public.planning_tasks(column_id);
CREATE INDEX idx_planning_tasks_assigned ON public.planning_tasks(assigned_to);
CREATE INDEX idx_planning_time_entries_task ON public.planning_time_entries(task_id);
CREATE INDEX idx_planning_time_entries_user ON public.planning_time_entries(user_id);
CREATE INDEX idx_planning_screenshots_entry ON public.planning_screenshots(time_entry_id);

-- Enable RLS on all tables
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS: planning_projects
CREATE POLICY "Block anon planning_projects" ON public.planning_projects FOR ALL USING (false);
CREATE POLICY "Clinic members can view planning_projects" ON public.planning_projects FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Admins can insert planning_projects" ON public.planning_projects FOR INSERT WITH CHECK (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
);
CREATE POLICY "Admins can update planning_projects" ON public.planning_projects FOR UPDATE USING (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
);
CREATE POLICY "Admins can delete planning_projects" ON public.planning_projects FOR DELETE USING (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
);
CREATE POLICY "Super admin planning_projects" ON public.planning_projects FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- RLS: planning_columns
CREATE POLICY "Block anon planning_columns" ON public.planning_columns FOR ALL USING (false);
CREATE POLICY "Clinic members can view planning_columns" ON public.planning_columns FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage planning_columns" ON public.planning_columns FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin planning_columns" ON public.planning_columns FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- RLS: planning_tasks
CREATE POLICY "Block anon planning_tasks" ON public.planning_tasks FOR ALL USING (false);
CREATE POLICY "Clinic members can view planning_tasks" ON public.planning_tasks FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage planning_tasks" ON public.planning_tasks FOR ALL USING (user_has_clinic_access(auth.uid(), clinic_id)) WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Super admin planning_tasks" ON public.planning_tasks FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- RLS: planning_time_entries
CREATE POLICY "Block anon planning_time_entries" ON public.planning_time_entries FOR ALL USING (false);
CREATE POLICY "Clinic members can view planning_time_entries" ON public.planning_time_entries FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can manage own time entries" ON public.planning_time_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all time entries" ON public.planning_time_entries FOR ALL USING (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
) WITH CHECK (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
);
CREATE POLICY "Super admin planning_time_entries" ON public.planning_time_entries FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- RLS: planning_screenshots
CREATE POLICY "Block anon planning_screenshots" ON public.planning_screenshots FOR ALL USING (false);
CREATE POLICY "Clinic members can view planning_screenshots" ON public.planning_screenshots FOR SELECT USING (user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Users can insert own screenshots" ON public.planning_screenshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all screenshots" ON public.planning_screenshots FOR ALL USING (
  user_has_clinic_access(auth.uid(), clinic_id) AND (
    EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
) WITH CHECK (
  user_has_clinic_access(auth.uid(), clinic_id)
);
CREATE POLICY "Super admin planning_screenshots" ON public.planning_screenshots FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Triggers for updated_at
CREATE TRIGGER update_planning_projects_updated_at BEFORE UPDATE ON public.planning_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_planning_tasks_updated_at BEFORE UPDATE ON public.planning_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('planning-screenshots', 'planning-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own screenshots" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'planning-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Clinic members can view screenshots" ON storage.objects FOR SELECT USING (
  bucket_id = 'planning-screenshots' AND auth.uid() IS NOT NULL
);
