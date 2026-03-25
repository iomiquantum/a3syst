import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export interface ResumenStats {
  clientesUnicos: number;
  escalados: number;
  agendados: number;
  noRespondieron: number;
  seguimiento: { total: number; s1: number; s2: number; s3: number; s4: number; s5: number; s6: number };
  nuevosClientes: number;
}

export interface TimeFilter {
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

const ALL_SEG_KEYS = Array.from({ length: 6 }, (_, i) => `seguimiento_s${i + 1}`);

export const usePipelineStats = (timeFilter?: TimeFilter) => {
  const { clinicId } = useClinic();
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [resumenStats, setResumenStats] = useState<ResumenStats>({
    clientesUnicos: 0, escalados: 0, agendados: 0, noRespondieron: 0,
    seguimiento: { total: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0 },
    nuevosClientes: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!clinicId) return;
    setLoading(true);

    // 1. Tab counts (current state — no date filter)
    const { data: convData } = await (supabase as any)
      .from("conversations")
      .select("pipeline_tab")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    const rows = convData || [];
    const counts: Record<string, number> = { todos: rows.length };
    rows.forEach((r: any) => {
      const tab = r.pipeline_tab || "resueltos_ia";
      counts[tab] = (counts[tab] || 0) + 1;
    });
    setTabCounts(counts);

    // 2. Date-filtered stats
    const startDate = timeFilter?.startDate || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const endDate = timeFilter?.endDate || new Date().toISOString();

    // Clientes únicos (inbound messages in period, count distinct conversation_id)
    const { data: uniqueContacts } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("clinic_id", clinicId)
      .eq("direction", "inbound")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const uniqueConvIds = new Set((uniqueContacts || []).map((m: any) => m.conversation_id));

    // Escalados a humano (pipeline history)
    const { count: escaladosCount } = await supabase
      .from("conversation_pipeline_history")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("to_tab", "escalados")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Agendados
    const { count: agendadosCount } = await supabase
      .from("conversation_pipeline_history")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("to_tab", "agendados")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Nuevos clientes (conversations created in period)
    const { count: nuevosCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Seguimiento breakdown by stage (current state, no date filter)
    const segBreakdown = {
      s1: counts["seguimiento_s1"] || 0,
      s2: counts["seguimiento_s2"] || 0,
      s3: counts["seguimiento_s3"] || 0,
      s4: counts["seguimiento_s4"] || 0,
      s5: counts["seguimiento_s5"] || 0,
      s6: counts["seguimiento_s6"] || 0,
    };
    const segTotal = Object.values(segBreakdown).reduce((a, b) => a + b, 0);

    setResumenStats({
      clientesUnicos: uniqueConvIds.size,
      escalados: escaladosCount || 0,
      agendados: agendadosCount || 0,
      noRespondieron: counts.no_responden || 0,
      seguimiento: { total: segTotal, ...segBreakdown },
      nuevosClientes: nuevosCount || 0,
    });

    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [clinicId, timeFilter?.startDate, timeFilter?.endDate]);

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
