import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface MarketingFragment {
  id: string;
  clinic_id: string;
  name: string;
  content: string;
  type: string;
  scope: string;
  usage_count: number;
  created_at: string;
}

export const useMarketingFragmentos = () => {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const queryKey = ["marketing-fragments", clinicId];

  const { data: fragments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_fragments")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingFragment[];
    },
    enabled: !!clinicId,
  });

  const createFragment = useMutation({
    mutationFn: async (payload: { name: string; content: string; type?: string; scope?: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_fragments")
        .insert({ clinic_id: clinicId!, ...payload });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Fragmento creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFragment = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; content?: string; type?: string; scope?: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_fragments")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Fragmento actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFragment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_fragments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Fragmento eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { fragments, isLoading, createFragment, updateFragment, deleteFragment };
};
