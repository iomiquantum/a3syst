import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/use-toast";

export interface PromptTemplate {
  id: string;
  clinic_id: string;
  type: "image" | "copy";
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePromptTemplates() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ["prompt-templates", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from("prompt_templates" as any)
        .select("*")
        .eq("clinic_id", clinicId)
        .order("type");
      if (error) throw error;
      return (data || []) as unknown as PromptTemplate[];
    },
    enabled: !!clinicId,
  });
}

export function useActivePromptTemplate(type: "image" | "copy") {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ["prompt-template-active", clinicId, type],
    queryFn: async () => {
      if (!clinicId) return null;
      const { data, error } = await supabase
        .from("prompt_templates" as any)
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("type", type)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PromptTemplate | null;
    },
    enabled: !!clinicId,
  });
}

export function useSavePromptTemplate() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tpl: { id?: string; type: "image" | "copy"; name: string; template: string; is_active: boolean }) => {
      if (!clinicId) throw new Error("No clinic");
      if (tpl.id) {
        const { data, error } = await supabase
          .from("prompt_templates" as any)
          .update({ name: tpl.name, template: tpl.template, is_active: tpl.is_active })
          .eq("id", tpl.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as PromptTemplate;
      } else {
        const { data, error } = await supabase
          .from("prompt_templates" as any)
          .insert({ clinic_id: clinicId, type: tpl.type, name: tpl.name, template: tpl.template, is_active: tpl.is_active })
          .select()
          .single();
        if (error) throw error;
        return data as unknown as PromptTemplate;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt-templates"] });
      qc.invalidateQueries({ queryKey: ["prompt-template-active"] });
      toast({ title: "Plantilla guardada" });
    },
    onError: (err: any) => {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    },
  });
}
