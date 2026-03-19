import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

interface ChannelCount {
  channel: string;
  count: number;
}

export const useChannelStats = () => {
  const { clinicId } = useClinic();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  const fetchCounts = async () => {
    if (!clinicId) return;

    const { data, error } = await (supabase as any)
      .from("conversations")
      .select("channel")
      .eq("clinic_id", clinicId)
      .eq("archived", false);

    if (error) {
      console.error("Error fetching channel stats:", error);
      return;
    }

    const map: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      const ch = r.channel || "whatsapp";
      map[ch] = (map[ch] || 0) + 1;
    });

    setCounts(map);
    setTotal(data?.length || 0);
  };

  useEffect(() => {
    fetchCounts();
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("channel-stats-" + clinicId)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `clinic_id=eq.${clinicId}` }, () => fetchCounts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return { counts, total };
};
