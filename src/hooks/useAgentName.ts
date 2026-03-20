import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export const useAgentName = () => {
  const { clinicId } = useClinic();
  const [agentName, setAgentName] = useState("Sofía");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Get global default
      const { data: globalRow } = await supabase
        .from("pipeline_global_rules")
        .select("rule_value")
        .eq("rule_key", "ai_agent_name")
        .maybeSingle();

      let name = "Sofía";
      if (globalRow?.rule_value) {
        const val = typeof globalRow.rule_value === "string"
          ? globalRow.rule_value.replace(/^"|"$/g, "")
          : String(globalRow.rule_value);
        if (val) name = val;
      }

      // Check clinic override
      if (clinicId) {
        const { data: clinicRow } = await supabase
          .from("clinic_pipeline_rules")
          .select("rule_value")
          .eq("clinic_id", clinicId)
          .eq("rule_key", "ai_agent_name")
          .maybeSingle();

        if (clinicRow?.rule_value) {
          const val = typeof clinicRow.rule_value === "string"
            ? clinicRow.rule_value.replace(/^"|"$/g, "")
            : String(clinicRow.rule_value);
          if (val) name = val;
        }
      }

      setAgentName(name);
      setLoading(false);
    };

    fetch();
  }, [clinicId]);

  return { agentName, loading };
};
