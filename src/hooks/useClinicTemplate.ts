import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export const useClinicTemplate = () => {
  const { clinicId } = useClinic();
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      const { data: config } = await supabase
        .from("clinic_pipeline_config")
        .select("pipeline_template_id")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!config?.pipeline_template_id) return;
      const { data: tpl } = await (supabase as any)
        .from("pipeline_templates")
        .select("slug")
        .eq("id", config.pipeline_template_id)
        .single();
      setTemplateSlug(tpl?.slug || null);
    })();
  }, [clinicId]);

  return { templateSlug };
};
