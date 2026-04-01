import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export interface MarketingKPIData {
  totalContacts: number;
  newContactsThisMonth: number;
  newContactsLastMonth: number;
  conversationsThisMonth: number;
  convertedThisMonth: number;
  convertedLastMonth: number;
  funnelCounts: { stage: string; count: number }[];
  loading: boolean;
}

export const useMarketingKPIs = (): MarketingKPIData => {
  const { clinicId } = useClinic();
  const [data, setData] = useState<Omit<MarketingKPIData, "loading">>({
    totalContacts: 0,
    newContactsThisMonth: 0,
    newContactsLastMonth: 0,
    conversationsThisMonth: 0,
    convertedThisMonth: 0,
    convertedLastMonth: 0,
    funnelCounts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;

    const fetchKPIs = async () => {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Parallel queries
      const [
        totalRes,
        newThisMonthRes,
        newLastMonthRes,
        convsRes,
        convertedRes,
        convertedLastRes,
        allContactsRes,
      ] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("funnel_stage", "convertido").gte("updated_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("funnel_stage", "convertido").gte("updated_at", startOfLastMonth).lte("updated_at", endOfLastMonth),
        supabase.from("contacts").select("funnel_stage").eq("clinic_id", clinicId),
      ]);

      // Compute funnel counts
      // Use pipeline_tab from conversations for a more accurate funnel view
      const { data: convs } = await supabase
        .from("conversations")
        .select("pipeline_tab")
        .eq("clinic_id", clinicId!)
        .eq("archived", false);

      const pipelineCounts: Record<string, number> = {};
      (convs || []).forEach((c: any) => {
        const tab = c.pipeline_tab || "nuevos";
        pipelineCounts[tab] = (pipelineCounts[tab] || 0) + 1;
      });

      const funnelCounts = Object.entries(pipelineCounts)
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      setData({
        totalContacts: totalRes.count || 0,
        newContactsThisMonth: newThisMonthRes.count || 0,
        newContactsLastMonth: newLastMonthRes.count || 0,
        conversationsThisMonth: convsRes.count || 0,
        convertedThisMonth: convertedRes.count || 0,
        convertedLastMonth: convertedLastRes.count || 0,
        funnelCounts,
      });
      setLoading(false);
    };

    fetchKPIs();
  }, [clinicId]);

  return { ...data, loading };
};
