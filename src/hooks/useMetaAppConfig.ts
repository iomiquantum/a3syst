import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MetaAppConfig {
  id: string;
  clinic_id: string;
  app_mode: "shared" | "custom";
  shared_app_id: string;
  custom_app_id: string | null;
  custom_app_secret_encrypted: string | null;
  custom_app_name: string | null;
  custom_app_status: string;
  custom_app_verified_at: string | null;
  setup_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  configured_by: string | null;
}

export const useMetaAppConfig = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const [config, setConfig] = useState<MetaAppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("meta_app_configurations")
      .select("*")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (error) console.error(error);
    setConfig(data as unknown as MetaAppConfig | null);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const currentMode = config?.app_mode || "shared";

  const saveConfig = async (updates: Partial<MetaAppConfig>) => {
    if (!clinicId) return false;

    if (config) {
      const { error } = await supabase
        .from("meta_app_configurations")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", config.id);
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase
        .from("meta_app_configurations")
        .insert({
          clinic_id: clinicId,
          configured_by: user?.id,
          ...updates,
        } as any);
      if (error) { toast.error(error.message); return false; }
    }

    await fetchConfig();
    return true;
  };

  const switchToShared = async () => {
    const ok = await saveConfig({
      app_mode: "shared",
      custom_app_id: null,
      custom_app_secret_encrypted: null,
      custom_app_name: null,
      custom_app_status: "pending",
      custom_app_verified_at: null,
      setup_completed: false,
    });
    if (ok) toast.success("Modo cambiado a App Compartida a3syst");
    return ok;
  };

  const switchToCustom = async (data: {
    custom_app_id: string;
    custom_app_secret: string;
    custom_app_name: string;
  }) => {
    const ok = await saveConfig({
      app_mode: "custom",
      custom_app_id: data.custom_app_id,
      custom_app_secret_encrypted: data.custom_app_secret, // In production, encrypt before storing
      custom_app_name: data.custom_app_name,
      custom_app_status: "verified",
      custom_app_verified_at: new Date().toISOString(),
      setup_completed: true,
    });
    if (ok) toast.success("¡App Propia configurada exitosamente!");
    return ok;
  };

  return {
    config,
    loading,
    currentMode,
    fetchConfig,
    saveConfig,
    switchToShared,
    switchToCustom,
  };
};
