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
};

export const useAIAgentConfig = () => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [config, setConfig] = useState<AIAgentConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);

    const fetch = async () => {
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
        });
      } else {
        setConfig(defaultConfig);
      }
      setLoading(false);
    };

    fetch();
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
    };

    const { data, error } = await supabase
      .from("ai_agent_config")
      .upsert({ ...payload, id: updated.id }, { onConflict: "clinic_id" })
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

  return { config, setConfig, loading, saving, save };
};
