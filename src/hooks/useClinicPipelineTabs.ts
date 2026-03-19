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

const GENERIC_TABS: Omit<PipelineTab, "count">[] = [
  { key: "todos", label: "Todos", color: "bg-muted text-muted-foreground", isTemplate: false },
  { key: "resueltos_ia", label: "Resueltos IA", icon: "Bot", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", isTemplate: false },
  { key: "seguimiento_c1", label: "Seguimiento", icon: "Clock", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", isTemplate: false },
  { key: "no_responden", label: "No responden", icon: "MessageSquareOff", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", isTemplate: false },
  { key: "no_interesado", label: "No interesado", icon: "ThumbsDown", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", isTemplate: false },
  { key: "escalados", label: "Escalados", icon: "AlertTriangle", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", isTemplate: false },
  { key: "clientes", label: "Clientes", icon: "UserCheck", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", isTemplate: false },
];

const COLOR_MAP: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  coral: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  gray: "bg-muted text-muted-foreground",
};

export const useClinicPipelineTabs = () => {
  const { clinicId } = useClinic();
  const [tabs, setTabs] = useState<PipelineTab[]>(GENERIC_TABS.map(t => ({ ...t, count: 0 })));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTabs = async () => {
    if (!clinicId) return;
    setLoading(true);

    // Check if clinic has a template
    const { data: config } = await supabase
      .from("clinic_pipeline_config")
      .select("pipeline_template_id")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    let templateTabs: Omit<PipelineTab, "count">[] = [];
    if (config?.pipeline_template_id) {
      setTemplateId(config.pipeline_template_id);
      const { data: template } = await (supabase as any)
        .from("pipeline_templates")
        .select("base_tabs")
        .eq("id", config.pipeline_template_id)
        .single();

      if (template?.base_tabs && Array.isArray(template.base_tabs)) {
        templateTabs = template.base_tabs.map((t: any) => ({
          key: t.slug || t.key,
          label: t.name || t.label,
          icon: t.icon,
          color: COLOR_MAP[t.color] || COLOR_MAP.gray,
          isTemplate: true,
        }));
      }
    }

    // Get counts
    const { data: convs } = await supabase
      .from("conversations")
      .select("pipeline_tab")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    const counts: Record<string, number> = {};
    let total = 0;
    (convs || []).forEach((c: any) => {
      const tab = c.pipeline_tab || "resueltos_ia";
      counts[tab] = (counts[tab] || 0) + 1;
      total++;
    });

    const allTabs = [
      ...GENERIC_TABS.map(t => ({
        ...t,
        count: t.key === "todos"
          ? total
          : t.key === "seguimiento_c1"
            ? (counts["seguimiento_c1"] || 0) + (counts["seguimiento_c2"] || 0) + (counts["seguimiento_c3"] || 0)
            : counts[t.key] || 0,
      })),
      ...templateTabs.map(t => ({
        ...t,
        count: counts[t.key] || 0,
      })),
    ];

    setTabs(allTabs);
    setLoading(false);
  };

  useEffect(() => { fetchTabs(); }, [clinicId]);

  return { tabs, templateId, loading, refetch: fetchTabs };
};
