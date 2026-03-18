import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/use-toast";

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

export interface AIAgentConfig {
  id?: string;
  agent_name: string;
  language: string;
  tone: string;
  greeting: string;
  objective: string;
  special_instructions: string;
  services: ServiceItem[];
  enabled: boolean;
  treatments_text: string;
  prices_text: string;
  locations_text: string;
  professionals_text: string;
}

const defaultConfig: AIAgentConfig = {
  agent_name: "Asistente Virtual",
  language: "es",
  tone: "profesional",
  greeting: "¡Hola! 👋 Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?",
  objective: "Atender consultas de pacientes, agendar citas y proporcionar información sobre tratamientos disponibles.",
  special_instructions: "- Siempre preguntar nombre y teléfono antes de agendar.\n- No dar diagnósticos médicos.\n- Derivar urgencias al número de emergencia.",
  services: [],
  enabled: true,
  treatments_text: "",
  prices_text: "",
  locations_text: "",
  professionals_text: "",
};

const HEALTH_TYPES = [
  "clinica_medica", "clinica_dental", "clinica_estetica", "clinica_veterinaria",
  "fisioterapia", "psicologia", "nutricion", "salud", "hospital", "laboratorio",
  "farmacia", "optica", "podologia", "dermatologia", "ginecologia", "pediatria",
  "traumatologia", "cardiologia", "oftalmologia", "urologia", "neurologia",
];

export const useAIAgentConfig = () => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [config, setConfig] = useState<AIAgentConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHealthBusiness, setIsHealthBusiness] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);

    const fetchAll = async () => {
      // Fetch clinic business type
      const { data: clinic } = await supabase
        .from("clinics")
        .select("business_type, business_category")
        .eq("id", clinicId)
        .maybeSingle();

      if (clinic) {
        const bt = (clinic.business_type || "").toLowerCase();
        const bc = (clinic.business_category || "").toLowerCase();
        setIsHealthBusiness(
          HEALTH_TYPES.some(h => bt.includes(h) || bc.includes(h)) ||
          bt.includes("clínica") || bt.includes("clinic") || bt.includes("salud") ||
          bt.includes("médic") || bt.includes("medic") || bt.includes("doctor") ||
          bc.includes("salud") || bc.includes("clinic") || bc.includes("médic")
        );
      }

      // Fetch agent config
      const { data, error } = await supabase
        .from("ai_agent_config")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          agent_name: data.agent_name,
          language: data.language,
          tone: data.tone,
          greeting: data.greeting,
          objective: data.objective,
          special_instructions: data.special_instructions,
          services: (data.services as any as ServiceItem[]) || [],
          enabled: data.enabled,
          treatments_text: (data as any).treatments_text || "",
          prices_text: (data as any).prices_text || "",
          locations_text: (data as any).locations_text || "",
          professionals_text: (data as any).professionals_text || "",
        });
      } else {
        setConfig(defaultConfig);
      }
      setLoading(false);
    };

    fetchAll();
  }, [clinicId]);

  const save = useCallback(async (updated: AIAgentConfig) => {
    if (!clinicId) return;
    setSaving(true);

    const payload = {
      clinic_id: clinicId,
      agent_name: updated.agent_name,
      language: updated.language,
      tone: updated.tone,
      greeting: updated.greeting,
      objective: updated.objective,
      special_instructions: updated.special_instructions,
      services: updated.services as any,
      enabled: updated.enabled,
      treatments_text: updated.treatments_text,
      prices_text: updated.prices_text,
      locations_text: updated.locations_text,
      professionals_text: updated.professionals_text,
    };

    const { data, error } = await supabase
      .from("ai_agent_config")
      .upsert({ ...payload, id: updated.id } as any, { onConflict: "clinic_id" })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
    } else {
      setConfig({ ...updated, id: data.id });
      toast({ title: "Guardado", description: "Configuración del agente IA actualizada." });
    }
  }, [clinicId, toast]);

  return { config, setConfig, loading, saving, save, isHealthBusiness };
};
