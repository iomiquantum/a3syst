import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

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
  const { businessId } = useBusiness();
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
    if (!businessId) return;

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
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", businessId),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", businessId).gte("created_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", businessId).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("clinic_id", businessId).gte("created_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", businessId).eq("funnel_stage", "convertido").gte("updated_at", startOfMonth),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("clinic_id", businessId).eq("funnel_stage", "convertido").gte("updated_at", startOfLastMonth).lte("updated_at", endOfLastMonth),
        supabase.from("contacts").select("funnel_stage").eq("clinic_id", businessId),
      ]);

      // Compute funnel counts
      const stageCounts: Record<string, number> = {};
      (allContactsRes.data || []).forEach((c: any) => {
        const s = c.funnel_stage || "nuevos";
        stageCounts[s] = (stageCounts[s] || 0) + 1;
      });

      const funnelOrder = ["nuevos", "contactado", "interesado", "cita_agendada", "convertido", "perdido"];
      const funnelCounts = funnelOrder.map(stage => ({
        stage,
        count: stageCounts[stage] || 0,
      }));

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
  }, [businessId]);

  return { ...data, loading };
};
