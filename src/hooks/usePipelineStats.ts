import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

interface ResumenStats {
  respondidos: number;
  escalados: number;
  convertidos: number;
  seguimiento: { total: number; s1_s4: number; s5_s6: number };
  noResponden: number;
}

const ALL_SEG_KEYS = Array.from({ length: 6 }, (_, i) => `seguimiento_s${i + 1}`);

export const usePipelineStats = () => {
  const { clinicId } = useClinic();
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [resumenStats, setResumenStats] = useState<ResumenStats>({
    respondidos: 0, escalados: 0, convertidos: 0,
    seguimiento: { total: 0, s1_s4: 0, s5_s6: 0 }, noResponden: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!clinicId) return;

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
    const counts: Record<string, number> = { todos: rows.length };

    rows.forEach((r: any) => {
      const tab = r.pipeline_tab || "resueltos_ia";
      counts[tab] = (counts[tab] || 0) + 1;
    });

    setTabCounts(counts);

    const segTotal = ALL_SEG_KEYS.reduce((s, k) => s + (counts[k] || 0), 0);
    const s1_s8 = ALL_SEG_KEYS.slice(0, 8).reduce((s, k) => s + (counts[k] || 0), 0);
    const s9_s10 = (counts["seguimiento_s9"] || 0) + (counts["seguimiento_s10"] || 0);

    setResumenStats({
      respondidos: (counts.resueltos_ia || 0) + (counts.pacientes || 0),
      escalados: counts.escalados || 0,
      convertidos: counts.pacientes || 0,
      seguimiento: { total: segTotal, s1_s8, s9_s10 },
      noResponden: counts.no_responden || 0,
    });

    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [clinicId]);

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
