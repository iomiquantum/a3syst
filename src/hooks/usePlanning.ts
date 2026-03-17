import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface PlanningProject {
  id: string;
  clinic_id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningColumn {
  id: string;
  project_id: string;
  clinic_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface PlanningTask {
  id: string;
  project_id: string;
  column_id: string;
  clinic_id: string;
  title: string;
  description: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PlanningTimeEntry {
  id: string;
  task_id: string;
  clinic_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  notes: string;
  created_at: string;
}

export interface PlanningScreenshot {
  id: string;
  time_entry_id: string;
  clinic_id: string;
  user_id: string;
  image_url: string;
  capture_type: string;
  captured_at: string;
}

// ─── Projects ────────────────────────────────
export function usePlanningProjects() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["planning-projects", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_projects")
        .select("*")
        .eq("clinic_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PlanningProject[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("planning_projects")
        .insert({
          clinic_id: businessId!,
          created_by: user!.id,
          name: input.name,
          description: input.description || "",
          color: input.color || "#6366f1",
        })
        .select()
        .single();
      if (error) throw error;
      // Create default columns
      const defaultCols = [
        { name: "Por hacer", color: "#94a3b8", position: 0 },
        { name: "En progreso", color: "#3b82f6", position: 1 },
        { name: "Revisión", color: "#f59e0b", position: 2 },
        { name: "Hecho", color: "#22c55e", position: 3 },
      ];
      await supabase.from("planning_columns").insert(
        defaultCols.map((c) => ({ ...c, project_id: data.id, clinic_id: businessId! }))
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-projects"] });
      toast({ title: "Proyecto creado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planning_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-projects"] });
      toast({ title: "Proyecto eliminado" });
    },
  });
}

// ─── Columns ─────────────────────────────────
export function usePlanningColumns(projectId: string | null) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["planning-columns", projectId],
    enabled: !!projectId && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_columns")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      if (error) throw error;
      return data as PlanningColumn[];
    },
  });
}

export function useCreateColumn() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; color?: string; position: number }) => {
      const { data, error } = await supabase
        .from("planning_columns")
        .insert({ ...input, clinic_id: businessId!, color: input.color || "#94a3b8" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-columns"] }),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planning_columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-columns"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
    },
  });
}

// ─── Tasks ───────────────────────────────────
export function usePlanningTasks(projectId: string | null) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["planning-tasks", projectId],
    enabled: !!projectId && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      if (error) throw error;
      return data as PlanningTask[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      column_id: string;
      title: string;
      description?: string;
      priority?: string;
      assigned_to?: string | null;
      due_date?: string | null;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("planning_tasks")
        .insert({
          ...input,
          clinic_id: businessId!,
          created_by: user!.id,
          priority: input.priority || "medium",
          position: input.position || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanningTask> & { id: string }) => {
      const { error } = await supabase.from("planning_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planning_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-tasks"] }),
  });
}

// ─── Time Entries ────────────────────────────
export function useTimeEntries(taskId?: string) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["planning-time-entries", taskId || "all"],
    enabled: !!businessId,
    queryFn: async () => {
      let q = supabase
        .from("planning_time_entries")
        .select("*")
        .eq("clinic_id", businessId!)
        .order("started_at", { ascending: false });
      if (taskId) q = q.eq("task_id", taskId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PlanningTimeEntry[];
    },
  });
}

export function useStartTimeEntry() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from("planning_time_entries")
        .insert({ task_id: taskId, clinic_id: businessId!, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-time-entries"] }),
  });
}

export function useStopTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, duration_seconds, notes }: { id: string; duration_seconds: number; notes?: string }) => {
      const { error } = await supabase
        .from("planning_time_entries")
        .update({ ended_at: new Date().toISOString(), duration_seconds, notes: notes || "" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-time-entries"] }),
  });
}

// ─── Screenshots ─────────────────────────────
export function useSaveScreenshot() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ timeEntryId, blob, captureType }: { timeEntryId: string; blob: Blob; captureType: string }) => {
      const fileName = `${user!.id}/${timeEntryId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("planning-screenshots")
        .upload(fileName, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("planning-screenshots").getPublicUrl(fileName);
      const { error } = await supabase.from("planning_screenshots").insert({
        time_entry_id: timeEntryId,
        clinic_id: businessId!,
        user_id: user!.id,
        image_url: urlData.publicUrl,
        capture_type: captureType,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-screenshots"] }),
  });
}

export function useScreenshots(timeEntryId?: string) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["planning-screenshots", timeEntryId || "all"],
    enabled: !!businessId && !!timeEntryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_screenshots")
        .select("*")
        .eq("time_entry_id", timeEntryId!)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return data as PlanningScreenshot[];
    },
  });
}

// ─── Profiles for assignment ─────────────────
export function useBusinessProfiles() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["business-profiles", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("clinic_id", businessId!);
      if (rolesErr) throw rolesErr;
      const userIds = roles?.map((r) => r.user_id) || [];
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);
      if (error) throw error;
      return data || [];
    },
  });
}
