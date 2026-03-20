import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface PipelineRules {
  inactivity_timeout_minutes: number;
  s1_delay_minutes: number;
  s2_delay_minutes: number;
  s3_delay_minutes: number;
  s4_delay_minutes: number;
  max_auto_contacts: number;
  recurrente_max_cycles: number;
  send_window_start_hour: number;
  send_window_end_hour: number;
}

const DEFAULTS: PipelineRules = {
  inactivity_timeout_minutes: 15,
  s1_delay_minutes: 15,
  s2_delay_minutes: 30,
  s3_delay_minutes: 240,
  s4_delay_minutes: 720,
  max_auto_contacts: 4,
  recurrente_max_cycles: 0,
  send_window_start_hour: 7,
  send_window_end_hour: 23,
};

export interface AutoMessage {
  id: string;
  clinic_id: string;
  contact_number: number;
  message_template: string;
  delay_minutes: number;
  is_active: boolean;
  is_automatic: boolean;
}

export const usePipelineRules = () => {
  const { clinicId } = useClinic();
  const [globalRules, setGlobalRules] = useState<PipelineRules>(DEFAULTS);
  const [clinicOverrides, setClinicOverrides] = useState<Partial<PipelineRules>>({});
  const [effectiveRules, setEffectiveRules] = useState<PipelineRules>(DEFAULTS);
  const [autoMessages, setAutoMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    setLoading(true);

    const { data: globalRows } = await supabase
      .from("pipeline_global_rules")
      .select("rule_key, rule_value");

    const globals = { ...DEFAULTS };
    (globalRows || []).forEach((r: any) => {
      const key = r.rule_key as keyof PipelineRules;
      if (key in globals) {
        globals[key] = typeof r.rule_value === "number" ? r.rule_value : Number(r.rule_value) || DEFAULTS[key];
      }
    });
    setGlobalRules(globals);

    const overrides: Partial<PipelineRules> = {};
    if (clinicId) {
      const { data: clinicRows } = await supabase
        .from("clinic_pipeline_rules")
        .select("rule_key, rule_value")
        .eq("clinic_id", clinicId);

      (clinicRows || []).forEach((r: any) => {
        const key = r.rule_key as keyof PipelineRules;
        if (key in DEFAULTS) {
          overrides[key] = typeof r.rule_value === "number" ? r.rule_value : Number(r.rule_value) || undefined;
        }
      });
    }
    setClinicOverrides(overrides);

    const effective = { ...globals };
    Object.keys(overrides).forEach((k) => {
      const key = k as keyof PipelineRules;
      if (overrides[key] !== undefined) {
        effective[key] = overrides[key]!;
      }
    });
    setEffectiveRules(effective);

    if (clinicId) {
      const { data: msgs } = await (supabase as any)
        .from("seguimiento_auto_messages")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("contact_number", { ascending: true });
      setAutoMessages(msgs || []);
    }

    setLoading(false);
  };

  const saveGlobalRule = async (key: string, value: number) => {
    const { error } = await supabase
      .from("pipeline_global_rules")
      .update({ rule_value: value as any, updated_at: new Date().toISOString() })
      .eq("rule_key", key);
    if (error) { toast.error(error.message); return; }
    toast.success("Regla global actualizada");
    await fetchRules();
  };

  const saveClinicOverride = async (key: string, value: number) => {
    if (!clinicId) return;
    const { error } = await supabase
      .from("clinic_pipeline_rules")
      .upsert({
        clinic_id: clinicId,
        rule_key: key,
        rule_value: value as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "clinic_id,rule_key" });
    if (error) { toast.error(error.message); return; }
    toast.success("Regla personalizada guardada");
    await fetchRules();
  };

  const removeClinicOverride = async (key: string) => {
    if (!clinicId) return;
    const { error } = await supabase
      .from("clinic_pipeline_rules")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("rule_key", key);
    if (error) { toast.error(error.message); return; }
    toast.success("Se usará el valor global");
    await fetchRules();
  };

  const saveAutoMessage = async (contactNumber: number, template: string, isActive: boolean) => {
    if (!clinicId) return;
    const { error } = await (supabase as any)
      .from("seguimiento_auto_messages")
      .upsert({
        clinic_id: clinicId,
        contact_number: contactNumber,
        message_template: template,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }, { onConflict: "clinic_id,contact_number" });
    if (error) { toast.error(error.message); return; }
    toast.success("Mensaje actualizado");
    await fetchRules();
  };

  useEffect(() => { fetchRules(); }, [clinicId]);

  return {
    globalRules,
    clinicOverrides,
    effectiveRules,
    autoMessages,
    loading,
    saveGlobalRule,
    saveClinicOverride,
    removeClinicOverride,
    saveAutoMessage,
    fetchRules,
    DEFAULTS,
  };
};
