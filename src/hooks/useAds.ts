import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface AdsAccount {
  id: string;
  clinic_id: string;
  platform: string;
  status: string;
  credentials: Record<string, any>;
  config: Record<string, any>;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdsBusinessBrief {
  id: string;
  clinic_id: string;
  name: string;
  answers: any[];
  audio_url: string | null;
  business_name: string | null;
  industry: string | null;
  description: string | null;
  locations: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdsStrategyTemplate {
  id: string;
  name: string;
  channel: string;
  objective: string;
  min_budget: number;
  currency: string;
  media_type: string;
  media_count: number;
  description: string | null;
  is_global: boolean;
  clinic_id: string | null;
  created_at: string;
}

export interface AdsCampaign {
  id: string;
  clinic_id: string;
  account_id: string | null;
  template_id: string | null;
  name: string;
  status: string;
  platform: string;
  daily_budget: number;
  currency: string;
  creatives_count: number;
  external_campaign_id: string | null;
  metrics: { spend: number; conversions: number; reach: number; revenue: number };
  created_at: string;
  updated_at: string;
}

export const useAds = () => {
  const { clinicId } = useClinic();
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [briefs, setBriefs] = useState<AdsBusinessBrief[]>([]);
  const [templates, setTemplates] = useState<AdsStrategyTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [accs, brfs, tmps, cmps] = await Promise.all([
      supabase.from("ads_accounts").select("*").eq("clinic_id", clinicId),
      supabase.from("ads_business_briefs").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("ads_strategy_templates").select("*").or(`is_global.eq.true,clinic_id.eq.${clinicId}`).order("name"),
      supabase.from("ads_campaigns").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
    ]);
    setAccounts((accs.data || []) as unknown as AdsAccount[]);
    setBriefs((brfs.data || []) as unknown as AdsBusinessBrief[]);
    setTemplates((tmps.data || []) as unknown as AdsStrategyTemplate[]);
    setCampaigns((cmps.data || []) as unknown as AdsCampaign[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Accounts
  const upsertAccount = async (platform: string, data: Partial<AdsAccount>) => {
    if (!clinicId) return false;
    const existing = accounts.find(a => a.platform === platform);
    if (existing) {
      const { error } = await supabase.from("ads_accounts").update(data as any).eq("id", existing.id);
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase.from("ads_accounts").insert({ clinic_id: clinicId, platform, ...data } as any);
      if (error) { toast.error(error.message); return false; }
    }
    toast.success("Cuenta publicitaria actualizada");
    await fetchAll();
    return true;
  };

  const disconnectAccount = async (id: string) => {
    const { error } = await supabase.from("ads_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta desconectada");
    await fetchAll();
  };

  // Briefs
  const saveBrief = async (data: Partial<AdsBusinessBrief>, briefId?: string) => {
    if (!clinicId) return false;
    if (briefId) {
      const { error } = await supabase.from("ads_business_briefs").update(data as any).eq("id", briefId);
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase.from("ads_business_briefs").insert({ clinic_id: clinicId, ...data } as any);
      if (error) { toast.error(error.message); return false; }
    }
    toast.success("Brief guardado correctamente");
    await fetchAll();
    return true;
  };

  // Campaigns
  const createCampaign = async (data: Partial<AdsCampaign>) => {
    if (!clinicId) return false;
    const { error } = await supabase.from("ads_campaigns").insert({ clinic_id: clinicId, ...data } as any);
    if (error) { toast.error(error.message); return false; }
    toast.success("Campaña creada correctamente");
    await fetchAll();
    return true;
  };

  const updateCampaign = async (id: string, data: Partial<AdsCampaign>) => {
    const { error } = await supabase.from("ads_campaigns").update(data as any).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    await fetchAll();
    return true;
  };

  // Aggregated metrics
  const totalMetrics = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + (c.metrics?.spend || 0),
      conversions: acc.conversions + (c.metrics?.conversions || 0),
      reach: acc.reach + (c.metrics?.reach || 0),
      revenue: acc.revenue + (c.metrics?.revenue || 0),
    }),
    { spend: 0, conversions: 0, reach: 0, revenue: 0 }
  );

  return {
    accounts, briefs, templates, campaigns,
    loading, fetchAll,
    upsertAccount, disconnectAccount,
    saveBrief, createCampaign, updateCampaign,
    totalMetrics,
  };
};
