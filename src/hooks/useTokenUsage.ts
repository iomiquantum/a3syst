import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export interface TokenRecord {
  id: string;
  generator_type: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  created_at: string;
}

export type TimeRange = "today" | "week" | "month" | "all";

export const useTokenUsage = () => {
  const { clinicId } = useClinic();
  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ai_token_usage")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(1000);
    setRecords((data as TokenRecord[]) || []);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const logUsage = useCallback(async (generatorType: string, model: string, tokensInput: number, tokensOutput: number) => {
    if (!clinicId) return;
    await supabase.from("ai_token_usage").insert({
      clinic_id: clinicId,
      generator_type: generatorType,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
    });
  }, [clinicId]);

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const filterByRange = (range: TimeRange) => {
    switch (range) {
      case "today": return records.filter(r => r.created_at.substring(0, 10) === todayStr);
      case "week": return records.filter(r => r.created_at >= weekAgo);
      case "month": return records.filter(r => r.created_at >= monthAgo);
      default: return records;
    }
  };

  const getSummary = (range: TimeRange) => {
    const filtered = filterByRange(range);
    const byType: Record<string, { calls: number; input: number; output: number }> = {};
    const byModel: Record<string, { calls: number; input: number; output: number }> = {};

    filtered.forEach(r => {
      if (!byType[r.generator_type]) byType[r.generator_type] = { calls: 0, input: 0, output: 0 };
      byType[r.generator_type].calls++;
      byType[r.generator_type].input += r.tokens_input;
      byType[r.generator_type].output += r.tokens_output;

      const modelName = r.model.split("/").pop() || r.model;
      if (!byModel[modelName]) byModel[modelName] = { calls: 0, input: 0, output: 0 };
      byModel[modelName].calls++;
      byModel[modelName].input += r.tokens_input;
      byModel[modelName].output += r.tokens_output;
    });

    return {
      totalCalls: filtered.length,
      totalInput: filtered.reduce((a, r) => a + r.tokens_input, 0),
      totalOutput: filtered.reduce((a, r) => a + r.tokens_output, 0),
      byType,
      byModel,
    };
  };

  const getHourlyData = (range: TimeRange) => {
    const filtered = filterByRange(range);
    const hourly: Record<string, { hour: string; tokens: number; calls: number }> = {};
    filtered.forEach(r => {
      const hour = r.created_at.substring(0, 13) + ":00";
      if (!hourly[hour]) hourly[hour] = { hour, tokens: 0, calls: 0 };
      hourly[hour].tokens += r.tokens_input + r.tokens_output;
      hourly[hour].calls++;
    });
    return Object.values(hourly).sort((a, b) => a.hour.localeCompare(b.hour));
  };

  const getDailyData = (range: TimeRange) => {
    const filtered = filterByRange(range);
    const daily: Record<string, { day: string; tokens: number; calls: number }> = {};
    filtered.forEach(r => {
      const day = r.created_at.substring(0, 10);
      if (!daily[day]) daily[day] = { day, tokens: 0, calls: 0 };
      daily[day].tokens += r.tokens_input + r.tokens_output;
      daily[day].calls++;
    });
    return Object.values(daily).sort((a, b) => a.day.localeCompare(b.day));
  };

  return { records, loading, logUsage, getSummary, getHourlyData, getDailyData, filterByRange, fetchRecords };
};
