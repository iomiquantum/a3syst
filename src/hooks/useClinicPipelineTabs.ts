import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import type { PipelineFilter } from "@/hooks/useConversationsByPipeline";

export interface PipelineTab {
  key: string;
  label: string;
  icon?: string;
  color: string;
  isTemplate: boolean;
  count: number;
}

// Embudo stages matching the user's system — manual assignment only
export const EMBUDO_STAGES: Omit<PipelineTab, "count">[] = [
  { key: "todos", label: "Todos", color: "bg-muted text-muted-foreground", isTemplate: false },
  { key: "nuevos", label: "Nuevos", color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300", isTemplate: false },
  { key: "ads", label: "ADS", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "contacto_1", label: "Contacto 1", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "contacto_2", label: "Contacto 2", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "contacto_3", label: "Contacto 3", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "no_responden", label: "No responden", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "no_interesado", label: "No interesado", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "pidio_info", label: "Pidio info", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "interesada", label: "Interesada", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "por_agendar", label: "Por Agendar", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "agendado", label: "AGENDADO", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", isTemplate: false },
  { key: "paciente_1ra_visita", label: "Paciente 1ra Visita", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "paciente_tratamiento", label: "Paciente Tratamiento", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "otras_ciudades", label: "Otras Ciudades", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "error_sistema_inicial", label: "Error del sistema inicial", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "notas_de_voz", label: "notas de voz", color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300", isTemplate: false },
  { key: "new_lead", label: "new_lead", color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300", isTemplate: false },
  { key: "citas_por_recordar", label: "Citas por recordar", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "test_audiencia", label: "Test audiencia", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "informacion_otras_clinicas", label: "Informacion Otras Clinicas", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "vitalscan_1", label: "VITALSCAN 1", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "vitalscan_2", label: "VITALSCAN 2", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "vitalscan_3", label: "VITALSCAN 3", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "no_asistio", label: "No asistio", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
];

// No sub-filters needed — purely manual
export const SEGUIMIENTO_SUB_FILTERS: any[] = [];
export const AGENDADOS_SUB_FILTERS: any[] = [];

export const useClinicPipelineTabs = () => {
  const { clinicId } = useClinic();
  const [tabs, setTabs] = useState<PipelineTab[]>(EMBUDO_STAGES.map(t => ({ ...t, count: 0 })));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [hasClinicTemplate, setHasClinicTemplate] = useState(false);
  const [subFilterCounts, setSubFilterCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchTabs = async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("conversations")
      .select("pipeline_tab")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    const counts: Record<string, number> = {};
    let total = 0;
    (convs || []).forEach((c: any) => {
      const tab = c.pipeline_tab || "nuevos";
      counts[tab] = (counts[tab] || 0) + 1;
      total++;
    });

    const allTabs: PipelineTab[] = EMBUDO_STAGES.map(t => ({
      ...t,
      count: t.key === "todos" ? total : counts[t.key] || 0,
    }));

    setTabs(allTabs);
    setSubFilterCounts({});
    setLoading(false);
  };

  useEffect(() => { fetchTabs(); }, [clinicId]);

  return { tabs, templateId, hasClinicTemplate, subFilterCounts, loading, refetch: fetchTabs };
};
