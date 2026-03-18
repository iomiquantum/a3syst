import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface ChannelPromptConfig {
  id?: string;
  channel: string;
  enabled: boolean;
  additional_prompt: string;
  welcome_message: string;
  welcome_message_enabled: boolean;
  fallback_message: string;
  max_response_length: number;
}

const defaultChannels: ChannelPromptConfig[] = [
  { channel: "whatsapp", enabled: false, additional_prompt: "", welcome_message: "", welcome_message_enabled: false, fallback_message: "Un momento, te comunico con un asesor humano.", max_response_length: 500 },
  { channel: "facebook", enabled: false, additional_prompt: "", welcome_message: "", welcome_message_enabled: false, fallback_message: "Un momento, te comunico con un asesor humano.", max_response_length: 500 },
  { channel: "instagram", enabled: false, additional_prompt: "", welcome_message: "", welcome_message_enabled: false, fallback_message: "Un momento, te comunico con un asesor humano.", max_response_length: 500 },
  { channel: "web_chat", enabled: false, additional_prompt: "", welcome_message: "", welcome_message_enabled: false, fallback_message: "Un momento, te comunico con un asesor humano.", max_response_length: 500 },
];

export const useAIChannelPrompts = () => {
  const { clinicId } = useClinic();
  const [channels, setChannels] = useState<ChannelPromptConfig[]>(defaultChannels);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    const fetchData = async () => {
      const { data } = await (supabase as any)
        .from("ai_agent_channel_prompts")
        .select("*")
        .eq("clinic_id", clinicId);
      if (data && data.length > 0) {
        setChannels(defaultChannels.map(dc => {
          const saved = data.find((d: any) => d.channel === dc.channel);
          return saved ? { ...dc, ...saved } : dc;
        }));
      } else {
        setChannels(defaultChannels);
      }
      setLoading(false);
    };
    fetchData();
  }, [clinicId]);

  const saveChannel = useCallback(async (channelConfig: ChannelPromptConfig) => {
    if (!clinicId) return;
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("ai_agent_channel_prompts")
      .upsert({
        clinic_id: clinicId,
        channel: channelConfig.channel,
        enabled: channelConfig.enabled,
        additional_prompt: channelConfig.additional_prompt,
        welcome_message: channelConfig.welcome_message,
        welcome_message_enabled: channelConfig.welcome_message_enabled,
        fallback_message: channelConfig.fallback_message,
        max_response_length: channelConfig.max_response_length,
        id: channelConfig.id || undefined,
      }, { onConflict: "clinic_id,channel" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la configuración del canal.");
    } else {
      setChannels(prev => prev.map(c => c.channel === channelConfig.channel ? { ...channelConfig, id: data.id } : c));
      toast.success(`Configuración de ${channelConfig.channel} guardada.`);
    }
  }, [clinicId]);

  const toggleChannel = useCallback(async (channel: string, enabled: boolean) => {
    const current = channels.find(c => c.channel === channel);
    if (current) await saveChannel({ ...current, enabled });
  }, [channels, saveChannel]);

  return { channels, loading, saving, saveChannel, toggleChannel };
};
