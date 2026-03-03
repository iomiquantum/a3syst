import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublishResult {
  success: boolean;
  results: Record<string, { success: boolean; externalId?: string; error?: string }>;
  message: string;
}

export const usePublishToMeta = () => {
  const [publishing, setPublishing] = useState(false);

  const publishNow = async (postId: string): Promise<PublishResult | null> => {
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-to-meta", {
        body: { post_id: postId },
      });

      if (error) {
        toast.error("Error al publicar: " + error.message);
        return null;
      }

      if (data?.success) {
        toast.success(data.message || "¡Publicado exitosamente!");
      } else {
        const errors = Object.entries(data?.results || {})
          .filter(([_, r]: any) => !r.success)
          .map(([p, r]: any) => `${p}: ${r.error}`)
          .join("; ");
        toast.error(data?.message || `Error: ${errors}`);
      }

      return data as PublishResult;
    } catch (err: any) {
      toast.error("Error de conexión: " + err.message);
      return null;
    } finally {
      setPublishing(false);
    }
  };

  return { publishNow, publishing };
};
