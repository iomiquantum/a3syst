import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface ProjectPhase {
  id: string;
  name: string;
  description: string | null;
  phase_number: number;
  color: string;
  icon: string;
  target_start_date: string | null;
  target_end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  depends_on: string | null;
  sort_order: number;
  tags: string[];
  lovable_prompt_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTaskNote {
  id: string;
  task_id: string;
  author_id: string | null;
  content: string;
  note_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

// ─── Phases ──────────────────────────────────
export function useProjectPhases() {
  return useQuery({
    queryKey: ["project-phases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_phases")
        .select("*")
        .order("phase_number");
      if (error) throw error;
      return data as ProjectPhase[];
    },
  });
}

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectPhase> & { name: string; phase_number: number }) => {
      const { data, error } = await (supabase as any)
        .from("project_phases")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectPhase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-phases"] });
      toast({ title: "Fase creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectPhase> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("project_phases")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-phases"] }),
  });
}

// ─── Tasks ───────────────────────────────────
export function useProjectTasks() {
  return useQuery({
    queryKey: ["project-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_tasks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ProjectTask[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectTask> & { phase_id: string; title: string }) => {
      const { data, error } = await (supabase as any)
        .from("project_tasks")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      toast({ title: "Tarea creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTask> & { id: string }) => {
      // If status changed, auto-create a note
      if (updates.status) {
        const { data: old } = await (supabase as any)
          .from("project_tasks")
          .select("status")
          .eq("id", id)
          .single();
        if (old && old.status !== updates.status) {
          await (supabase as any).from("project_task_notes").insert({
            task_id: id,
            author_id: user?.id || null,
            content: `Estado cambiado: ${statusLabel(old.status)} → ${statusLabel(updates.status)}`,
            note_type: "status_change",
          });
        }
      }
      const { error } = await (supabase as any)
        .from("project_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["project-task-notes"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("project_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      toast({ title: "Tarea eliminada" });
    },
  });
}

export function useBulkCreateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tasks: Array<Partial<ProjectTask> & { phase_id: string; title: string }>) => {
      const { error } = await (supabase as any).from("project_tasks").insert(tasks);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      toast({ title: "Tareas importadas" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useBulkCreatePhases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phases: Array<Partial<ProjectPhase> & { name: string; phase_number: number }>) => {
      const { data, error } = await (supabase as any).from("project_phases").insert(phases).select();
      if (error) throw error;
      return data as ProjectPhase[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-phases"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ─── Notes ───────────────────────────────────
export function useTaskNotes(taskId: string | null) {
  return useQuery({
    queryKey: ["project-task-notes", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_task_notes")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at");
      if (error) throw error;
      return data as ProjectTaskNote[];
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { task_id: string; content: string; note_type?: string; metadata?: Record<string, any> }) => {
      const { data, error } = await (supabase as any)
        .from("project_task_notes")
        .insert({ ...input, author_id: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTaskNote;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["project-task-notes", vars.task_id] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ─── Helpers ─────────────────────────────────
export function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: "⏳ Pendiente",
    in_progress: "🔄 En progreso",
    testing: "🧪 Testing",
    completed: "✅ Completado",
    blocked: "🚫 Bloqueado",
  };
  return m[s] || s;
}

export function priorityLabel(p: string) {
  const m: Record<string, string> = {
    critical: "🔴 Crítica",
    high: "🟠 Alta",
    medium: "🟡 Media",
    low: "🟢 Baja",
  };
  return m[p] || p;
}
