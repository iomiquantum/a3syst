import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SeguimientoStrategy {
  id: string;
  contact_number: number;
  strategy_name: string;
  strategy_description: string;
  psychological_principle: string;
  barrier_it_solves: string;
  prompt_instruction: string;
  rules: string;
}

export const useSeguimientoStrategies = () => {
  const [strategies, setStrategies] = useState<SeguimientoStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("seguimiento_strategies")
        .select("*")
        .order("contact_number", { ascending: true });
      setStrategies(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { strategies, loading };
};
