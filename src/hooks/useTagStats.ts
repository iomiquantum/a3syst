import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

interface TagStat {
  tag: string;
  count: number;
}

export const useTagStats = () => {
  const { clinicId } = useClinic();
  const [tags, setTags] = useState<TagStat[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchTags = async () => {
    if (!clinicId) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("tags")
      .eq("clinic_id", clinicId);

    if (error) {
      console.error("Error fetching tag stats:", error);
      return;
    }

    const countMap: Record<string, number> = {};
    (data || []).forEach((c: any) => {
      (c.tags || []).forEach((t: string) => {
        countMap[t] = (countMap[t] || 0) + 1;
      });
    });

    const sorted = Object.entries(countMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    setTags(sorted);
    setAllTags(sorted.map(s => s.tag));
  };

  useEffect(() => {
    fetchTags();
  }, [clinicId]);

  return { tags, allTags };
};
