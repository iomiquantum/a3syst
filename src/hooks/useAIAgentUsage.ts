import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export interface UsageRecord {
  id: string;
  conversation_id: string;
  tokens_input: number;
  tokens_output: number;
  model: string;
  triggered_by: string;
  created_at: string;
}

export interface UsageSummary {
  totalCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  autoCalls: number;
  manualCalls: number;
  todayCalls: number;
  last30DaysCalls: number;
}

export const useAIAgentUsage = () => {
  const { clinicId } = useClinic();
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ai_agent_usage")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(200);

      setRecords((data as UsageRecord[]) || []);
      setLoading(false);
    };

    fetch();
  }, [clinicId]);

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const summary: UsageSummary = {
    totalCalls: records.length,
    totalTokensInput: records.reduce((a, r) => a + r.tokens_input, 0),
    totalTokensOutput: records.reduce((a, r) => a + r.tokens_output, 0),
    autoCalls: records.filter((r) => r.triggered_by === "auto").length,
    manualCalls: records.filter((r) => r.triggered_by === "manual").length,
    todayCalls: records.filter((r) => r.created_at.substring(0, 10) === todayStr).length,
    last30DaysCalls: records.filter((r) => r.created_at >= thirtyDaysAgo).length,
  };

  return { records, summary, loading };
};
