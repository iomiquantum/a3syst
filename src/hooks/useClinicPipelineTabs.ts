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

// Generic tabs (all businesses see these) — 6 tabs
const GENERIC_TABS: Omit<PipelineTab, "count">[] = [
  { key: "todos", label: "Todos", color: "bg-muted text-muted-foreground", isTemplate: false },
  { key: "resueltos_ia", label: "Resueltos IA", icon: "Bot", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", isTemplate: false },
  { key: "seguimiento_s1", label: "Seguimiento", icon: "Clock", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "no_responden", label: "No responden", icon: "MessageSquareOff", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", isTemplate: false },
  { key: "no_interesado", label: "No interesado", icon: "ThumbsDown", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", isTemplate: false },
  { key: "escalados", label: "Escalados", icon: "AlertTriangle", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", isTemplate: false },
];

// Clinic template tabs (only clinics see these) — 5 tabs
const CLINIC_TEMPLATE_TABS: Omit<PipelineTab, "count">[] = [
  { key: "agendados", label: "Agendados", icon: "CalendarCheck", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", isTemplate: true },
  { key: "no_show", label: "No-show", icon: "CalendarX", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", isTemplate: true },
  { key: "show_sin_venta", label: "Show sin venta", icon: "UserX", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", isTemplate: true },
  { key: "pacientes", label: "Pacientes", icon: "HeartPulse", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", isTemplate: true },
  { key: "perdidos", label: "Perdidos", icon: "Archive", color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300", isTemplate: true },
];

// Sub-filter definitions for Seguimiento (S1-S6)
export const SEGUIMIENTO_SUB_FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "seguimiento_s1", label: "S1", badge: "IA", badgeColor: "bg-blue-100 text-blue-700" },
  { key: "seguimiento_s2", label: "S2", badge: "IA", badgeColor: "bg-blue-100 text-blue-700" },
  { key: "seguimiento_s3", label: "S3", badge: "IA", badgeColor: "bg-blue-100 text-blue-700" },
  { key: "seguimiento_s4", label: "S4", badge: "IA", badgeColor: "bg-blue-100 text-blue-700" },
  { key: "seguimiento_s5", label: "S5", badge: "Humano", badgeColor: "bg-amber-100 text-amber-700" },
  { key: "seguimiento_s6", label: "S6", badge: "Humano", badgeColor: "bg-amber-100 text-amber-700" },
];

export const AGENDADOS_SUB_FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "agendado", label: "Agendado", badge: null, badgeColor: "bg-emerald-100 text-emerald-700" },
  { key: "confirmado", label: "Confirmado", badge: null, badgeColor: "bg-teal-100 text-teal-700" },
  { key: "asistio", label: "Asistió", badge: null, badgeColor: "bg-teal-100 text-teal-700" },
  { key: "show_con_venta", label: "Show con venta", badge: null, badgeColor: "bg-emerald-100 text-emerald-700" },
];

const ALL_SEG_KEYS = Array.from({ length: 10 }, (_, i) => `seguimiento_s${i + 1}`);

export const useClinicPipelineTabs = () => {
  const { clinicId } = useClinic();
  const [tabs, setTabs] = useState<PipelineTab[]>(GENERIC_TABS.map(t => ({ ...t, count: 0 })));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [hasClinicTemplate, setHasClinicTemplate] = useState(false);
  const [subFilterCounts, setSubFilterCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchTabs = async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: config } = await supabase
      .from("clinic_pipeline_config")
      .select("pipeline_template_id")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    const isClinicTemplate = !!config?.pipeline_template_id;
    setHasClinicTemplate(isClinicTemplate);
    if (config?.pipeline_template_id) setTemplateId(config.pipeline_template_id);

    const { data: convs } = await supabase
      .from("conversations")
      .select("pipeline_tab, appointment_status")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    const counts: Record<string, number> = {};
    const appointmentCounts: Record<string, number> = {};
    let total = 0;
    (convs || []).forEach((c: any) => {
      const tab = c.pipeline_tab || "resueltos_ia";
      counts[tab] = (counts[tab] || 0) + 1;
      total++;
      if (tab === "agendados" && c.appointment_status) {
        appointmentCounts[c.appointment_status] = (appointmentCounts[c.appointment_status] || 0) + 1;
      }
    });

    const seguimientoTotal = ALL_SEG_KEYS.reduce((sum, k) => sum + (counts[k] || 0), 0);

    // Build sub-filter counts
    const sfCounts: Record<string, number> = {
      "seg:todos": seguimientoTotal,
      "ag:todos": counts["agendados"] || 0,
      "ag:agendado": appointmentCounts["agendado"] || 0,
      "ag:confirmado": appointmentCounts["confirmado"] || 0,
      "ag:asistio": appointmentCounts["asistio"] || 0,
      "ag:show_con_venta": appointmentCounts["show_con_venta"] || 0,
    };
    ALL_SEG_KEYS.forEach(k => { sfCounts[`seg:${k}`] = counts[k] || 0; });
    setSubFilterCounts(sfCounts);

    const allTabs: PipelineTab[] = [
      ...GENERIC_TABS.map(t => ({
        ...t,
        count: t.key === "todos"
          ? total
          : t.key === "seguimiento_s1"
            ? seguimientoTotal
            : counts[t.key] || 0,
      })),
      ...(isClinicTemplate ? CLINIC_TEMPLATE_TABS.map(t => ({
        ...t,
        count: counts[t.key] || 0,
      })) : []),
    ];

    setTabs(allTabs);
    setLoading(false);
  };

  useEffect(() => { fetchTabs(); }, [clinicId]);

  return { tabs, templateId, hasClinicTemplate, subFilterCounts, loading, refetch: fetchTabs };
};
