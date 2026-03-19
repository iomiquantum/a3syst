import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import type { PipelineTab } from "@/hooks/useConversationsByPipeline";

interface TabCounts {
  todos: number;
  resueltos_ia: number;
  seguimiento_c1: number;
  seguimiento_c2: number;
  seguimiento_c3: number;
  no_responden: number;
  no_interesado: number;
  escalados: number;
  clientes: number;
}

interface ResumenStats {
  respondidos: number;
  escalados: number;
  convertidos: number;
  seguimiento: { c1: number; c2: number; c3: number; total: number };
  noResponden: number;
}

export const usePipelineStats = () => {
  const { clinicId } = useClinic();
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    todos: 0, resueltos_ia: 0, seguimiento_c1: 0, seguimiento_c2: 0,
    seguimiento_c3: 0, no_responden: 0, no_interesado: 0, escalados: 0, clientes: 0,
  });
  const [resumenStats, setResumenStats] = useState<ResumenStats>({
    respondidos: 0, escalados: 0, convertidos: 0,
    seguimiento: { c1: 0, c2: 0, c3: 0, total: 0 }, noResponden: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!clinicId) return;

    // Fetch all non-archived conversations for this clinic
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select("pipeline_tab")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    if (error) {
      console.error("Error fetching pipeline stats:", error);
      setLoading(false);
      return;
    }

    const rows = data || [];
    const counts: TabCounts = {
      todos: rows.length,
      resueltos_ia: 0, seguimiento_c1: 0, seguimiento_c2: 0,
      seguimiento_c3: 0, no_responden: 0, no_interesado: 0, escalados: 0, clientes: 0,
    };

    rows.forEach((r: any) => {
      const tab = r.pipeline_tab as PipelineTab;
      if (tab in counts) {
        counts[tab as keyof TabCounts] = (counts[tab as keyof TabCounts] as number) + 1;
      }
    });

    setTabCounts(counts);

    const c1 = counts.seguimiento_c1;
    const c2 = counts.seguimiento_c2;
    const c3 = counts.seguimiento_c3;

    setResumenStats({
      respondidos: counts.resueltos_ia + counts.clientes,
      escalados: counts.escalados,
      convertidos: counts.clientes,
      seguimiento: { c1, c2, c3, total: c1 + c2 + c3 },
      noResponden: counts.no_responden,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [clinicId]);

  // Realtime
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("pipeline-stats-" + clinicId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `clinic_id=eq.${clinicId}`,
      }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return { tabCounts, resumenStats, loading, refetch: fetchStats };
};
