import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";

export type PromptTemplateType = "image" | "copy" | "video";

export interface PromptTemplate {
  id: string;
  clinic_id: string;
  type: PromptTemplateType;
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePromptTemplates() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["prompt-templates", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("prompt_templates" as any)
        .select("*")
        .eq("clinic_id", businessId)
        .order("type");
      if (error) throw error;
      return (data || []) as unknown as PromptTemplate[];
    },
    enabled: !!businessId,
  });
}

export function useActivePromptTemplate(type: PromptTemplateType) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["prompt-template-active", businessId, type],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from("prompt_templates" as any)
        .select("*")
        .eq("clinic_id", businessId)
        .eq("type", type)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PromptTemplate | null;
    },
    enabled: !!businessId,
  });
}

export function useSavePromptTemplate() {
  const qc = useQueryClient();
  const { businessId } = useBusiness();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tpl: { id?: string; type: PromptTemplateType; name: string; template: string; is_active: boolean }) => {
      if (!businessId) throw new Error("No clinic");
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
          .insert({ clinic_id: businessId, type: tpl.type, name: tpl.name, template: tpl.template, is_active: tpl.is_active })
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
