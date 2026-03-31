import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface MarketingAudience {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  type: string;
  filters: Record<string, any>;
  contact_count: number;
  estimated_count: number;
  status: string;
  created_at: string;
}

export const useMarketingAudiencias = () => {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const queryKey = ["marketing-audiences", clinicId];

  const { data: audiences = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_audiences")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingAudience[];
    },
    enabled: !!clinicId,
  });

  const createAudience = useMutation({
    mutationFn: async (payload: { name: string; description?: string; type?: string; filters?: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from("marketing_audiences")
        .insert({ clinic_id: clinicId!, ...payload });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Audiencia creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAudience = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string; status?: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_audiences")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Audiencia actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAudience = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_audiences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Audiencia eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { audiences, isLoading, createAudience, updateAudience, deleteAudience };
};
