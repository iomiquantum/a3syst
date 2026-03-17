import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SocialConnection {
  id: string;
  clinic_id: string;
  platform: string;
  platform_name: string;
  platform_account_id: string;
  access_token: string;
  token_status: string;
  token_expires_at: string | null;
  token_last_verified_at: string | null;
  metadata: Record<string, any>;
  is_primary: boolean;
  connected_by: string | null;
  connected_at: string;
  updated_at: string;
}

export interface PostLog {
  id: string;
  clinic_id: string;
  connection_id: string;
  content_post_id: string | null;
  platform: string;
  post_type: string;
  content_text: string | null;
  media_urls: string[] | null;
  platform_post_id: string | null;
  status: string;
  published_at: string | null;
  error_message: string | null;
  engagement_data: Record<string, any>;
  created_at: string;
}

export const useSocialConnections = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [postLogs, setPostLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [connRes, logRes] = await Promise.all([
      supabase
        .from("social_media_connections")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("connected_at", { ascending: false }),
      supabase
        .from("social_media_posts_log")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (connRes.error) console.error(connRes.error);
    if (logRes.error) console.error(logRes.error);
    setConnections((connRes.data || []) as unknown as SocialConnection[]);
    setPostLogs((logRes.data || []) as unknown as PostLog[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const getConnection = (platform: string) => connections.find(c => c.platform === platform);
  const fbConnection = connections.find(c => c.platform === "facebook");
  const igConnection = connections.find(c => c.platform === "instagram");

  const saveConnection = async (data: {
    platform: string;
    platform_name: string;
    platform_account_id: string;
    access_token: string;
    metadata?: Record<string, any>;
  }) => {
    if (!clinicId) return false;
    const existing = connections.find(
      c => c.platform === data.platform && c.platform_account_id === data.platform_account_id
    );

    if (existing) {
      const { error } = await supabase
        .from("social_media_connections")
        .update({
          platform_name: data.platform_name,
          access_token: data.access_token,
          token_status: "active",
          token_last_verified_at: new Date().toISOString(),
          metadata: data.metadata || {},
          is_primary: true,
        } as any)
        .eq("id", existing.id);
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase
        .from("social_media_connections")
        .insert({
          clinic_id: clinicId,
          platform: data.platform,
          platform_name: data.platform_name,
          platform_account_id: data.platform_account_id,
          access_token: data.access_token,
          token_status: "active",
          token_last_verified_at: new Date().toISOString(),
          metadata: data.metadata || {},
          is_primary: true,
          connected_by: user?.id,
        } as any);
      if (error) { toast.error(error.message); return false; }
    }

    toast.success(`${data.platform === "facebook" ? "Facebook" : "Instagram"} conectado exitosamente`);
    await fetchConnections();
    return true;
  };

  const disconnectPlatform = async (connectionId: string) => {
    const { error } = await supabase
      .from("social_media_connections")
      .delete()
      .eq("id", connectionId);
    if (error) { toast.error(error.message); return false; }
    toast.success("Cuenta desconectada");
    await fetchConnections();
    return true;
  };

  const verifyToken = async (connectionId: string): Promise<{ valid: boolean; error?: string }> => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return { valid: false, error: "Conexión no encontrada" };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me?access_token=${conn.access_token}`
      );
      const data = await res.json();

      if (data.error) {
        await supabase
          .from("social_media_connections")
          .update({ token_status: "expired" } as any)
          .eq("id", connectionId);
        await fetchConnections();
        return { valid: false, error: data.error.message };
      }

      await supabase
        .from("social_media_connections")
        .update({
          token_status: "active",
          token_last_verified_at: new Date().toISOString(),
        } as any)
        .eq("id", connectionId);
      await fetchConnections();
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  };

  const testPublish = async (
    connectionId: string,
    message: string,
    imageUrl?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return { success: false, error: "Conexión no encontrada" };

    try {
      let result;
      if (conn.platform === "facebook") {
        if (imageUrl) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_account_id}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: imageUrl, message, access_token: conn.access_token }),
          });
          result = await res.json();
        } else {
          const res = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_account_id}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, access_token: conn.access_token }),
          });
          result = await res.json();
        }
      } else if (conn.platform === "instagram") {
        if (!imageUrl) return { success: false, error: "Instagram requiere una imagen" };
        // Step 1: Create container
        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_account_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl, caption: message, access_token: conn.access_token }),
        });
        const containerData = await containerRes.json();
        if (containerData.error) return { success: false, error: containerData.error.message };

        // Step 2: Publish
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_account_id}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: containerData.id, access_token: conn.access_token }),
        });
        result = await publishRes.json();
      }

      if (result?.error) {
        // Log failed attempt
        await supabase.from("social_media_posts_log").insert({
          clinic_id: clinicId,
          connection_id: connectionId,
          platform: conn.platform,
          post_type: imageUrl ? "image" : "text",
          content_text: message,
          media_urls: imageUrl ? [imageUrl] : [],
          status: "failed",
          error_message: result.error.message,
          created_by: user?.id,
        } as any);
        return { success: false, error: result.error.message };
      }

      // Log success
      const postId = result?.id || result?.post_id;
      await supabase.from("social_media_posts_log").insert({
        clinic_id: clinicId,
        connection_id: connectionId,
        platform: conn.platform,
        post_type: imageUrl ? "image" : "text",
        content_text: message,
        media_urls: imageUrl ? [imageUrl] : [],
        platform_post_id: postId,
        status: "published",
        published_at: new Date().toISOString(),
        created_by: user?.id,
      } as any);

      return { success: true, postId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    connections,
    postLogs,
    loading,
    fetchConnections,
    getConnection,
    fbConnection,
    igConnection,
    saveConnection,
    disconnectPlatform,
    verifyToken,
    testPublish,
  };
};
