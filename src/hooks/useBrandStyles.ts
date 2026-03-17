import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface BrandStyle {
  id: string;
  clinic_id: string;
  name: string;
  reference_images: string[];
  palette: { hex: string; name: string }[];
  style_description: string;
  created_at: string;
  updated_at: string;
}

const MAX_STYLES = 3;

export const useBrandStyles = () => {
  const { businessId } = useBusiness();
  const [styles, setStyles] = useState<BrandStyle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStyles = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from("clinic_brand_styles")
      .select("*")
      .eq("clinic_id", businessId)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    setStyles((data || []) as unknown as BrandStyle[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!businessId) return null;
    const ext = file.name.split(".").pop();
    const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("brand-references").upload(path, file);
    if (error) { toast.error("Error subiendo imagen"); return null; }
    const { data: { publicUrl } } = supabase.storage.from("brand-references").getPublicUrl(path);
    return publicUrl;
  };

  const createStyle = async (name: string, imageUrls: string[]): Promise<BrandStyle | null> => {
    if (!businessId) return null;
    if (styles.length >= MAX_STYLES) {
      toast.error(`Máximo ${MAX_STYLES} estilos permitidos`);
      return null;
    }
    const { data, error } = await supabase
      .from("clinic_brand_styles")
      .insert({ clinic_id: businessId, name, reference_images: imageUrls } as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    await fetchStyles();
    return data as unknown as BrandStyle;
  };

  const updateStyle = async (id: string, updates: Partial<BrandStyle>) => {
    const { error } = await supabase
      .from("clinic_brand_styles")
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    await fetchStyles();
    return true;
  };

  const deleteStyle = async (id: string) => {
    const { error } = await supabase
      .from("clinic_brand_styles")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Estilo eliminado");
    await fetchStyles();
    return true;
  };

  return { styles, loading, createStyle, updateStyle, deleteStyle, uploadImage, canCreate: styles.length < MAX_STYLES };
};
