import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlatformResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

interface PublishResult {
  success: boolean;
  results: Record<string, PlatformResult>;
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

      const results = (data?.results || {}) as Record<string, PlatformResult>;
      const platformNames: Record<string, string> = {
        facebook: "Facebook",
        instagram: "Instagram",
      };

      // Show individual per-platform toasts
      const succeeded: string[] = [];
      const failed: { platform: string; error: string }[] = [];

      for (const [platform, result] of Object.entries(results)) {
        const name = platformNames[platform] || platform;
        if (result.success) {
          succeeded.push(name);
        } else {
          failed.push({ platform: name, error: result.error || "Error desconocido" });
        }
      }

      if (succeeded.length > 0) {
        toast.success(`✅ Publicado en: ${succeeded.join(", ")}`);
      }

      for (const f of failed) {
        toast.error(`❌ ${f.platform}: ${f.error}`, { duration: 8000 });
      }

      if (succeeded.length === 0 && failed.length === 0) {
        toast.error(data?.message || "No se pudo publicar");
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
