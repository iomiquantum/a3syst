import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface ContentPost {
  id: string;
  clinic_id: string;
  title: string | null;
  body: string | null;
  media_urls: string[];
  media_type: string;
  post_type: string;
  status: string;
  platforms: string[];
  scheduled_at: string | null;
  published_at: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  hashtags: string[];
  link_url: string | null;
  first_comment: string | null;
  metrics: { likes: number; comments: number; shares: number; reach: number; impressions: number };
  external_ids: Record<string, string>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useContentPosts = () => {
  const { clinicId } = useClinic();
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("content_posts")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error cargando contenido");
      console.error(error);
    }
    setPosts((data || []) as unknown as ContentPost[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createPost = async (data: Partial<ContentPost>) => {
    if (!clinicId) return null;
    const { data: created, error } = await supabase
      .from("content_posts")
      .insert({ clinic_id: clinicId, ...data } as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success(data.status === "scheduled" ? "Publicación programada" : "Borrador guardado");
    await fetchPosts();
    return created;
  };

  const updatePost = async (id: string, data: Partial<ContentPost>) => {
    const { error } = await supabase
      .from("content_posts")
      .update(data as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    await fetchPosts();
    return true;
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase
      .from("content_posts")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Publicación eliminada");
    await fetchPosts();
    return true;
  };

  // Derived data
  const scheduled = posts.filter(p => p.status === "scheduled");
  const drafts = posts.filter(p => p.status === "draft");
  const published = posts.filter(p => p.status === "published");

  return {
    posts, loading, fetchPosts,
    createPost, updatePost, deletePost,
    scheduled, drafts, published,
  };
};
