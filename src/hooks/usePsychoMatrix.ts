import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/use-toast";

export interface PsychoService {
  id: string;
  clinic_id: string;
  name: string;
  core_benefit: string;
  pain_point: string;
  target_price: string;
  price: number;
  observations: string;
  created_at: string;
}

export interface PsychoStrategy {
  id: string;
  clinic_id: string;
  service_id: string;
  name: string;
  archetype: string;
  brand_voice: string;
  persuasion_trigger: string;
  generation: string;
  advanced_tech: string | null;
  generated_prompt: string | null;
  created_at: string;
}

export function usePsychoServices() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ["psycho-services", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from("psycho_matrix_services" as any)
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PsychoService[];
    },
    enabled: !!clinicId,
  });
}

export function usePsychoStrategies() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ["psycho-strategies", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from("psycho_matrix_strategies" as any)
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PsychoStrategy[];
    },
    enabled: !!clinicId,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (svc: { name: string; core_benefit: string; pain_point: string; target_price: string; price?: number; observations?: string }) => {
      if (!clinicId) throw new Error("No hay clínica seleccionada");
      const { data, error } = await supabase
        .from("psycho_matrix_services" as any)
        .insert({ ...svc, clinic_id: clinicId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PsychoService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["psycho-services"] });
      toast({ title: "Servicio creado" });
    },
    onError: (error: any) => {
      console.error("Error creando servicio:", error);
      toast({ title: "Error al crear servicio", description: error.message, variant: "destructive" });
    },
  });
}

export function useSaveStrategy() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (strategy: {
      service_id: string;
      name: string;
      archetype: string;
      brand_voice: string;
      persuasion_trigger: string;
      generation: string;
      advanced_tech?: string;
      generated_prompt?: string;
    }) => {
      if (!clinicId) throw new Error("No clinic");
      const { data, error } = await supabase
        .from("psycho_matrix_strategies" as any)
        .insert({ ...strategy, clinic_id: clinicId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PsychoStrategy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["psycho-strategies"] });
      toast({ title: "Estrategia guardada" });
    },
  });
}

export function useUpdateStrategy() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PsychoStrategy> }) => {
      const { data, error } = await supabase
        .from("psycho_matrix_strategies" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PsychoStrategy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["psycho-strategies"] });
      toast({ title: "Estrategia actualizada" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStrategy() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("psycho_matrix_strategies" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["psycho-strategies"] });
      toast({ title: "Estrategia eliminada" });
    },
    onError: (error: any) => {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    },
  });
}
