import { useState } from "react";
import { MessageSquare, Facebook, Instagram, Globe, Save, ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAIChannelPrompts, ChannelPromptConfig } from "@/hooks/useAIChannelPrompts";
import { AIAgentConfig } from "@/hooks/useAIAgentConfig";

interface ChannelPromptsSectionProps {
  agentConfig: AIAgentConfig;
}

const channelMeta: Record<string, { label: string; icon: React.ReactNode; emoji: string; placeholder: string }> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageSquare className="w-4 h-4" />,
    emoji: "💬",
    placeholder: "Escribe aquí instrucciones específicas para WhatsApp. Por ejemplo: tono, estilo de mensaje, flujo de conversación, información adicional del negocio...",
  },
  facebook: {
    label: "Facebook Messenger",
    icon: <Facebook className="w-4 h-4" />,
    emoji: "📘",
    placeholder: "Escribe aquí instrucciones específicas para Facebook Messenger...",
  },
  instagram: {
    label: "Instagram",
    icon: <Instagram className="w-4 h-4" />,
    emoji: "📸",
    placeholder: "Escribe aquí instrucciones específicas para Instagram...",
  },
  web_chat: {
    label: "Web Chat",
    icon: <Globe className="w-4 h-4" />,
    emoji: "🌐",
    placeholder: "Escribe aquí instrucciones específicas para Web Chat...",
  },
};

const ChannelCard = ({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: ChannelPromptConfig;
  onChange: (updated: ChannelPromptConfig) => void;
  onSave: () => void;
  saving: boolean;
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const meta = channelMeta[config.channel];

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{meta.emoji}</span> {meta.label}
          </CardTitle>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => onChange({ ...config, enabled: v })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Instrucciones adicionales para {meta.label}</Label>
          <Textarea
            value={config.additional_prompt}
            onChange={(e) => onChange({ ...config, additional_prompt: e.target.value })}
            placeholder={meta.placeholder}
            rows={4}
            disabled={!config.enabled}
            className={!config.enabled ? "opacity-60" : ""}
          />
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Opciones avanzadas
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensaje de bienvenida</Label>
                <Switch
                  checked={config.welcome_message_enabled}
                  onCheckedChange={(v) => onChange({ ...config, welcome_message_enabled: v })}
                  disabled={!config.enabled}
                />
              </div>
              <Textarea
                value={config.welcome_message}
                onChange={(e) => onChange({ ...config, welcome_message: e.target.value })}
                placeholder="Mensaje que se envía automáticamente al primer contacto..."
                rows={2}
                disabled={!config.enabled || !config.welcome_message_enabled}
                className={(!config.enabled || !config.welcome_message_enabled) ? "opacity-60" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensaje fallback (cuando el agente no puede responder)</Label>
              <Textarea
                value={config.fallback_message}
                onChange={(e) => onChange({ ...config, fallback_message: e.target.value })}
                rows={2}
                disabled={!config.enabled}
                className={!config.enabled ? "opacity-60" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Máximo caracteres por respuesta</Label>
              <Input
                type="number"
                value={config.max_response_length}
                onChange={(e) => onChange({ ...config, max_response_length: parseInt(e.target.value) || 500 })}
                min={100}
                max={2000}
                className="w-32"
                disabled={!config.enabled}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button onClick={onSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Guardar {meta.label}
        </Button>
      </CardContent>
    </Card>
  );
};

const ChannelPromptsSection = ({ agentConfig }: ChannelPromptsSectionProps) => {
  const { channels, loading, saving, saveChannel } = useAIChannelPrompts();
  const [localChannels, setLocalChannels] = useState<ChannelPromptConfig[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sync from hook when loaded
  if (!loading && localChannels.length === 0 && channels.length > 0) {
    setLocalChannels([...channels]);
  }

  const updateLocal = (channel: string, updated: ChannelPromptConfig) => {
    setLocalChannels((prev) => prev.map((c) => (c.channel === channel ? updated : c)));
  };

  const buildPreview = (channel: string) => {
    const ch = localChannels.find((c) => c.channel === channel);
    const services = agentConfig.services || [];
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";

    let preview = `Eres "${agentConfig.agent_name}", un asistente virtual del negocio.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}

OBJETIVO:
${agentConfig.objective}

SERVICIOS DISPONIBLES:
${services.map((s) => `• ${s.name} — $${s.price} — ${s.description}`).join("\n") || "(sin servicios)"}

INSTRUCCIONES:
${agentConfig.special_instructions}

SALUDO INICIAL:
${agentConfig.greeting}`;

    if (ch?.additional_prompt) {
      preview += `\n\n=== INSTRUCCIONES ESPECÍFICAS PARA ${channelMeta[channel]?.label?.toUpperCase()} ===\n${ch.additional_prompt}`;
    } else {
      preview += `\n\n(Sin instrucciones adicionales para este canal)`;
    }

    if (ch?.max_response_length) {
      preview += `\n\nIMPORTANTE: Responde en máximo ${ch.max_response_length} caracteres.`;
    }

    return preview;
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando configuración de canales...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Separator />
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">📡 Instrucciones por Canal</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Activa el agente en cada canal y agrega instrucciones adicionales que se suman al prompt general de arriba.
        </p>
      </div>

      {localChannels.map((ch) => (
        <ChannelCard
          key={ch.channel}
          config={ch}
          onChange={(updated) => updateLocal(ch.channel, updated)}
          onSave={() => {
            const current = localChannels.find((c) => c.channel === ch.channel);
            if (current) saveChannel(current);
          }}
          saving={saving}
        />
      ))}

      {/* Preview section */}
      <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            {previewOpen ? "Ocultar" : "👁️ Vista previa del prompt completo"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Vista previa del prompt combinado</CardTitle>
              <CardDescription>
                Así verá el agente IA las instrucciones completas para cada canal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="whatsapp">
                <TabsList>
                  <TabsTrigger value="whatsapp">💬 WhatsApp</TabsTrigger>
                  <TabsTrigger value="facebook">📘 Facebook</TabsTrigger>
                  <TabsTrigger value="instagram">📸 Instagram</TabsTrigger>
                  <TabsTrigger value="web_chat">🌐 Web Chat</TabsTrigger>
                </TabsList>
                {["whatsapp", "facebook", "instagram", "web_chat"].map((ch) => (
                  <TabsContent key={ch} value={ch}>
                    <div className="bg-muted rounded-lg p-4 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {buildPreview(ch)}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ChannelPromptsSection;
