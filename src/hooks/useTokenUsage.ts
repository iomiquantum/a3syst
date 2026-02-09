import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClinic } from "@/hooks/useClinic";

export interface TokenRecord {
  id: string;
  user_id: string | null;
  generator_type: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  action_label: string;
  created_at: string;
}

export type TimeRange = "today" | "week" | "month" | "all";

// Pricing per 1M tokens (input/output) — approximate 2026 rates
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-3-pro-preview": { input: 1.25, output: 10.0 },
  "gemini-3-flash-preview": { input: 0.15, output: 0.60 },
  "gemini-3-pro-image-preview": { input: 1.25, output: 10.0 },
  "gpt-5": { input: 2.50, output: 10.0 },
  "gpt-5-mini": { input: 0.40, output: 1.60 },
  "gpt-5-nano": { input: 0.10, output: 0.40 },
  "gpt-5.2": { input: 3.00, output: 12.0 },
  // Image generation (flat cost approximations per call)
  "imagen-3.0-generate-002": { input: 0, output: 0 },
};

// Flat image generation cost per image
const IMAGE_COST_PER_CALL = 0.04; // ~$0.04 per image

export function estimateCost(model: string, tokensInput: number, tokensOutput: number, generatorType: string): number {
  const modelKey = model.split("/").pop() || model;
  const pricing = MODEL_PRICING[modelKey];

  if (generatorType === "image") {
    return IMAGE_COST_PER_CALL;
  }

  if (!pricing) {
    // Fallback: assume gemini-2.5-flash pricing
    return (tokensInput * 0.15 + tokensOutput * 0.60) / 1_000_000;
  }

  return (tokensInput * pricing.input + tokensOutput * pricing.output) / 1_000_000;
}

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

  const logUsage = useCallback(async (
    generatorType: string,
    model: string,
    tokensInput: number,
    tokensOutput: number,
    actionLabel: string = "",
  ) => {
    if (!clinicId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const costUsd = estimateCost(model, tokensInput, tokensOutput, generatorType);

    await supabase.from("ai_token_usage").insert({
      clinic_id: clinicId,
      user_id: user?.id || null,
      generator_type: generatorType,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
      action_label: actionLabel,
    } as any);

    // Check budget limits after logging
    await checkBudgetAlerts(user?.id || null, costUsd);
  }, [clinicId]);

  const checkBudgetAlerts = useCallback(async (userId: string | null, lastCost: number) => {
    if (!clinicId) return;

    // Get current month's total for clinic
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const { data: monthRecords } = await supabase
      .from("ai_token_usage")
      .select("cost_usd, user_id")
      .eq("clinic_id", clinicId)
      .gte("created_at", monthStartStr);

    const totalClinicCost = (monthRecords || []).reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);

    // Check clinic budget
    const { data: clinic } = await supabase
      .from("clinics")
      .select("monthly_token_budget_usd")
      .eq("id", clinicId)
      .single();

    const clinicBudget = (clinic as any)?.monthly_token_budget_usd;
    if (clinicBudget !== null && clinicBudget !== undefined && clinicBudget > 0) {
      const pct = (totalClinicCost / clinicBudget) * 100;
      if (pct >= 100) {
        toast.error(`⚠️ La clínica ha superado el presupuesto mensual de IA ($${clinicBudget.toFixed(2)}). Consumo actual: $${totalClinicCost.toFixed(2)}`);
      } else if (pct >= 80) {
        toast.warning(`⚠️ La clínica ha consumido el ${pct.toFixed(0)}% del presupuesto mensual de IA ($${totalClinicCost.toFixed(2)} / $${clinicBudget.toFixed(2)})`);
      }
    }

    // Check user budget
    if (userId) {
      const { data: userLimit } = await supabase
        .from("user_token_limits")
        .select("monthly_budget_usd")
        .eq("user_id", userId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      const userBudget = (userLimit as any)?.monthly_budget_usd;
      if (userBudget !== null && userBudget !== undefined && userBudget > 0) {
        const userTotal = (monthRecords || [])
          .filter(r => r.user_id === userId)
          .reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);
        const pct = (userTotal / userBudget) * 100;
        if (pct >= 100) {
          toast.error(`⚠️ Has superado tu límite mensual de IA ($${userBudget.toFixed(2)}). Consumo: $${userTotal.toFixed(2)}`);
        } else if (pct >= 80) {
          toast.warning(`⚠️ Has consumido el ${pct.toFixed(0)}% de tu límite mensual de IA ($${userTotal.toFixed(2)} / $${userBudget.toFixed(2)})`);
        }
      }
    }
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
    const byType: Record<string, { calls: number; input: number; output: number; cost: number }> = {};
    const byModel: Record<string, { calls: number; input: number; output: number; cost: number }> = {};
    const byUser: Record<string, { calls: number; input: number; output: number; cost: number; userId: string }> = {};

    filtered.forEach(r => {
      const cost = Number(r.cost_usd) || 0;

      if (!byType[r.generator_type]) byType[r.generator_type] = { calls: 0, input: 0, output: 0, cost: 0 };
      byType[r.generator_type].calls++;
      byType[r.generator_type].input += r.tokens_input;
      byType[r.generator_type].output += r.tokens_output;
      byType[r.generator_type].cost += cost;

      const modelName = r.model.split("/").pop() || r.model;
      if (!byModel[modelName]) byModel[modelName] = { calls: 0, input: 0, output: 0, cost: 0 };
      byModel[modelName].calls++;
      byModel[modelName].input += r.tokens_input;
      byModel[modelName].output += r.tokens_output;
      byModel[modelName].cost += cost;

      const uid = r.user_id || "unknown";
      if (!byUser[uid]) byUser[uid] = { calls: 0, input: 0, output: 0, cost: 0, userId: uid };
      byUser[uid].calls++;
      byUser[uid].input += r.tokens_input;
      byUser[uid].output += r.tokens_output;
      byUser[uid].cost += cost;
    });

    return {
      totalCalls: filtered.length,
      totalInput: filtered.reduce((a, r) => a + r.tokens_input, 0),
      totalOutput: filtered.reduce((a, r) => a + r.tokens_output, 0),
      totalCost: filtered.reduce((a, r) => a + (Number(r.cost_usd) || 0), 0),
      byType,
      byModel,
      byUser,
    };
  };

  const getHourlyData = (range: TimeRange) => {
    const filtered = filterByRange(range);
    const hourly: Record<string, { hour: string; tokens: number; calls: number; cost: number }> = {};
    filtered.forEach(r => {
      const hour = r.created_at.substring(0, 13) + ":00";
      if (!hourly[hour]) hourly[hour] = { hour, tokens: 0, calls: 0, cost: 0 };
      hourly[hour].tokens += r.tokens_input + r.tokens_output;
      hourly[hour].calls++;
      hourly[hour].cost += Number(r.cost_usd) || 0;
    });
    return Object.values(hourly).sort((a, b) => a.hour.localeCompare(b.hour));
  };

  const getDailyData = (range: TimeRange) => {
    const filtered = filterByRange(range);
    const daily: Record<string, { day: string; tokens: number; calls: number; cost: number }> = {};
    filtered.forEach(r => {
      const day = r.created_at.substring(0, 10);
      if (!daily[day]) daily[day] = { day, tokens: 0, calls: 0, cost: 0 };
      daily[day].tokens += r.tokens_input + r.tokens_output;
      daily[day].calls++;
      daily[day].cost += Number(r.cost_usd) || 0;
    });
    return Object.values(daily).sort((a, b) => a.day.localeCompare(b.day));
  };

  return { records, loading, logUsage, getSummary, getHourlyData, getDailyData, filterByRange, fetchRecords };
};
