import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, eachDayOfInterval, subDays } from "date-fns";

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalCalls: number;
  answered: number;
  noAnswer: number;
  conversions: number;
}

export interface DailyCallData {
  date: string;
  calls: number;
  answered: number;
}

export interface CallCenterMetrics {
  totalContacts: number;
  totalCalls: number;
  answeredCalls: number;
  conversionRate: number;
  agentMetrics: AgentMetrics[];
  dailyCalls: DailyCallData[];
  stageDistribution: { stage: string; count: number }[];
}

export const useCallCenterMetrics = () => {
  const { clinicId } = useClinic();
  const [metrics, setMetrics] = useState<CallCenterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "3months">("month");

  useEffect(() => {
    if (!clinicId) return;

    const fetchMetrics = async () => {
      setLoading(true);
      const now = new Date();
      let fromDate: Date;
      if (period === "week") fromDate = subDays(now, 7);
      else if (period === "month") fromDate = startOfMonth(now);
      else fromDate = startOfMonth(subMonths(now, 2));

      const fromISO = fromDate.toISOString();

      // Fetch contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, funnel_stage")
        .eq("clinic_id", clinicId);

      // Fetch call logs in period
      const { data: calls } = await supabase
        .from("call_logs")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("created_at", fromISO)
        .order("created_at", { ascending: true });

      // Fetch profiles for agent names
      const agentIds = [...new Set((calls || []).map(c => c.logged_by).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", agentIds as string[]);
        (profiles || []).forEach(p => { profilesMap[p.user_id] = p.full_name || "Sin nombre"; });
      }

      const allCalls = calls || [];
      const allContacts = contacts || [];
      const totalContacts = allContacts.length;
      const totalCalls = allCalls.length;
      const answeredCalls = allCalls.filter(c => c.outcome === "contestada").length;
      const convertedContacts = allContacts.filter(c => c.funnel_stage === "convertido").length;
      const conversionRate = totalContacts > 0 ? (convertedContacts / totalContacts) * 100 : 0;

      // Agent metrics
      const agentMap: Record<string, AgentMetrics> = {};
      allCalls.forEach(call => {
        const aid = call.logged_by || "unknown";
        if (!agentMap[aid]) {
          agentMap[aid] = {
            agentId: aid,
            agentName: profilesMap[aid] || "Sin asignar",
            totalCalls: 0,
            answered: 0,
            noAnswer: 0,
            conversions: 0,
          };
        }
        agentMap[aid].totalCalls++;
        if (call.outcome === "contestada") agentMap[aid].answered++;
        else agentMap[aid].noAnswer++;
      });

      // Count conversions per agent (contacts converted that have call_logs by that agent)
      const convertedContactIds = new Set(allContacts.filter(c => c.funnel_stage === "convertido").map(c => c.id));
      allCalls.forEach(call => {
        if (convertedContactIds.has(call.contact_id)) {
          const aid = call.logged_by || "unknown";
          if (agentMap[aid]) agentMap[aid].conversions++;
        }
      });

      // Daily calls
      const days = eachDayOfInterval({ start: fromDate, end: now });
      const dailyMap: Record<string, DailyCallData> = {};
      days.forEach(d => {
        const key = format(d, "yyyy-MM-dd");
        dailyMap[key] = { date: key, calls: 0, answered: 0 };
      });
      allCalls.forEach(call => {
        const key = call.created_at.substring(0, 10);
        if (dailyMap[key]) {
          dailyMap[key].calls++;
          if (call.outcome === "contestada") dailyMap[key].answered++;
        }
      });

      // Stage distribution
      const stageCounts: Record<string, number> = {};
      allContacts.forEach(c => {
        stageCounts[c.funnel_stage] = (stageCounts[c.funnel_stage] || 0) + 1;
      });

      setMetrics({
        totalContacts,
        totalCalls,
        answeredCalls,
        conversionRate,
        agentMetrics: Object.values(agentMap).sort((a, b) => b.totalCalls - a.totalCalls),
        dailyCalls: Object.values(dailyMap),
        stageDistribution: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
      });
      setLoading(false);
    };

    fetchMetrics();
  }, [clinicId, period]);

  return { metrics, loading, period, setPeriod };
};
