import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface MarketingBroadcast {
  id: string;
  clinic_id: string;
  name: string;
  audience_id: string | null;
  template_name: string | null;
  template_language: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  audience?: { name: string } | null;
}

export const useMarketingDifusiones = () => {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const queryKey = ["marketing-broadcasts", clinicId];

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_broadcasts")
        .select("*, audience:marketing_audiences(name)")
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingBroadcast[];
    },
    enabled: !!clinicId,
  });

  const createBroadcast = useMutation({
    mutationFn: async (payload: { name: string; audience_id?: string; template_name?: string; channel?: string; scheduled_at?: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_broadcasts")
        .insert({ clinic_id: clinicId!, ...payload });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Difusión creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const broadcast = broadcasts.find(b => b.id === id);
      if (broadcast && broadcast.status !== "borrador") {
        throw new Error("Solo se pueden eliminar difusiones en borrador");
      }
      const { error } = await (supabase as any)
        .from("marketing_broadcasts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Difusión eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { broadcasts, isLoading, createBroadcast, deleteBroadcast };
};
