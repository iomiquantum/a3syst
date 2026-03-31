import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface MarketingTag {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const useMarketingTags = () => {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const queryKey = ["marketing-tags", clinicId];

  const { data: tags = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_tags")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MarketingTag[];
    },
    enabled: !!clinicId,
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_tags")
        .insert({ clinic_id: clinicId!, name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Tag creado");
    },
    onError: (e: Error) => {
      if (e.message.includes("duplicate") || e.message.includes("unique")) {
        toast.error("Ya existe un tag con ese nombre");
      } else {
        toast.error(e.message);
      }
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_tags")
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Tag actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Tag eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { tags, isLoading, createTag, updateTag, deleteTag };
};
