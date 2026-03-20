import { useState, useEffect } from "react";
import { MessageSquare, Columns3, Bot } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export type ViewMode = "buzon" | "pipeline";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  selectedChannel?: string;
}

const MensajesHeader = ({ viewMode, onViewModeChange, selectedChannel = "todos" }: Props) => {
  const { clinicId } = useClinic();
  const [channelAutopilot, setChannelAutopilot] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine which channel to check — "todos" means WhatsApp (primary)
  const effectiveChannel = selectedChannel === "todos" ? "whatsapp" : selectedChannel;

  useEffect(() => {
    if (!clinicId) return;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("ai_agent_channel_prompts")
        .select("enabled")
        .eq("clinic_id", clinicId)
        .eq("channel", effectiveChannel)
        .maybeSingle();
      setChannelAutopilot(data?.enabled ?? false);
    };
    fetchStatus();
  }, [clinicId, effectiveChannel]);

  const handleToggleChannelAutopilot = async (active: boolean) => {
    if (!clinicId) return;
    setLoading(true);
    setChannelAutopilot(active);

    const { error } = await (supabase as any)
      .from("ai_agent_channel_prompts")
      .update({ enabled: active })
      .eq("clinic_id", clinicId)
      .eq("channel", effectiveChannel);

    if (error) {
      setChannelAutopilot(!active);
      toast.error("Error al cambiar Autopilot del canal");
    } else {
      toast.success(active
        ? `Autopilot ${effectiveChannel} activado para TODO el canal`
        : `Autopilot ${effectiveChannel} desactivado para TODO el canal`
      );
    }
    setLoading(false);
  };

  const channelLabel = effectiveChannel === "whatsapp" ? "WhatsApp"
    : effectiveChannel === "web" ? "Web"
    : effectiveChannel.charAt(0).toUpperCase() + effectiveChannel.slice(1);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          💬 Mensajes
        </h1>
        {channelAutopilot !== null && (
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: channelAutopilot ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
              backgroundColor: channelAutopilot ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted))",
              color: channelAutopilot ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            <Bot className="w-3 h-3" />
            <span>Autopilot {channelLabel}</span>
            <Switch
              checked={channelAutopilot}
              onCheckedChange={handleToggleChannelAutopilot}
              disabled={loading}
              className="scale-75"
            />
          </div>
        )}
      </div>
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={v => v && onViewModeChange(v as ViewMode)}
        size="sm"
        className="border border-border rounded-md overflow-hidden gap-0"
      >
        <ToggleGroupItem value="buzon" className="px-3 py-1.5 text-xs gap-1.5 rounded-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <MessageSquare className="w-3.5 h-3.5" /> Buzón
        </ToggleGroupItem>
        <ToggleGroupItem value="pipeline" className="px-3 py-1.5 text-xs gap-1.5 rounded-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Columns3 className="w-3.5 h-3.5" /> Pipeline
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default MensajesHeader;
