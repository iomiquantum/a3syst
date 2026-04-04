import { useEffect, useMemo, useState } from "react";
import { Bot, FlaskConical, Loader2, MessageSquareText, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAIChannelPrompts, ChannelPromptConfig } from "@/hooks/useAIChannelPrompts";
import { AIAgentConfig } from "@/hooks/useAIAgentConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PromptStudioSectionProps {
  agentConfig: AIAgentConfig;
  onSaveBase: () => Promise<void> | void;
  onUpdateBase: <K extends keyof AIAgentConfig>(key: K, value: AIAgentConfig[K]) => void;
  savingBase: boolean;
}

type TestMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const channelMeta: Record<string, { label: string; emoji: string }> = {
  whatsapp: { label: "WhatsApp", emoji: "💬" },
  facebook: { label: "Facebook Messenger", emoji: "📘" },
  instagram: { label: "Instagram", emoji: "📸" },
  web_chat: { label: "Web Chat", emoji: "🌐" },
};

const systemGuardrails = [
  "No inventar servicios, horarios, precios ni reglas que no estén configurados.",
  "Si el paciente quiere agendar, ir directo a servicio, fecha y hora sin preguntar cosas irrelevantes.",
  "Respetar disponibilidad, días bloqueados y horarios válidos antes de ofrecer una cita.",
  "Si ya respondió algo en el historial, no repetir la misma pregunta.",
  "Mantener respuestas breves, claras y controladas.",
];

const PromptStudioSection = ({ agentConfig, onSaveBase, onUpdateBase, savingBase }: PromptStudioSectionProps) => {
  const { clinicId } = useClinic();
  const { channels, loading, saving, saveChannel } = useAIChannelPrompts();
  const [localChannels, setLocalChannels] = useState<ChannelPromptConfig[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [contextSummary, setContextSummary] = useState({
    clinicName: "",
    timezone: "America/Guayaquil",
    branchesText: "(sin sedes configuradas)",
    blockedDatesText: "Sin días bloqueados registrados.",
  });

  useEffect(() => {
    setLocalChannels(channels.map((channel) => ({ ...channel })));
  }, [channels]);

  useEffect(() => {
    if (!clinicId) return;

    const fetchContext = async () => {
      const [{ data: clinic }, { data: branches }, { data: blockedDays }] = await Promise.all([
        supabase.from("clinics").select("name, timezone").eq("id", clinicId).maybeSingle(),
        supabase
          .from("branches")
          .select("name, address, full_address, working_schedule")
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase.from("blocked_days").select("date").eq("clinic_id", clinicId).order("date", { ascending: true }),
      ]);

      const dayLabels: Record<string, string> = {
        lunes: "Lunes",
        martes: "Martes",
        miercoles: "Miércoles",
        jueves: "Jueves",
        viernes: "Viernes",
        sabado: "Sábado",
        domingo: "Domingo",
      };

      const branchesText = (branches || []).length > 0
        ? (branches || []).map((branch: any) => {
            const schedule = branch.working_schedule as Record<string, { enabled: boolean; open: string; close: string; last_appointment?: string }> | null;
            const lines = schedule
              ? Object.entries(dayLabels).map(([key, label]) => {
                  if (!schedule[key]?.enabled) return `• ${label}: cerrado`;
                  const lastAppointment = schedule[key]?.last_appointment ? ` (última cita: ${schedule[key].last_appointment})` : "";
                  return `• ${label}: ${schedule[key].open} a ${schedule[key].close}${lastAppointment}`;
                }).join("\n")
              : "• Horario no configurado";

            return `📍 ${branch.name}\n${branch.full_address || branch.address || "Dirección no configurada"}\n${lines}`;
          }).join("\n\n")
        : "(sin sedes configuradas)";

      const blockedDatesText = blockedDays && blockedDays.length > 0
        ? blockedDays.map((item: any) => item.date).join(", ")
        : "Sin días bloqueados registrados.";

      setContextSummary({
        clinicName: clinic?.name || "Tu negocio",
        timezone: clinic?.timezone || "America/Guayaquil",
        branchesText,
        blockedDatesText,
      });
    };

    fetchContext();
  }, [clinicId]);

  const selectedChannelConfig = useMemo(() => {
    return localChannels.find((channel) => channel.channel === selectedChannel) || {
      channel: selectedChannel,
      enabled: false,
      additional_prompt: "",
      welcome_message: "",
      welcome_message_enabled: false,
      fallback_message: "Un momento, te comunico con un asesor humano.",
      max_response_length: 500,
    };
  }, [localChannels, selectedChannel]);

  const updateSelectedChannel = (patch: Partial<ChannelPromptConfig>) => {
    setLocalChannels((previous) => previous.map((channel) => (
      channel.channel === selectedChannel ? { ...channel, ...patch } : channel
    )));
  };

  const buildPromptPreview = () => {
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";
    const services = agentConfig.services || [];
    const selectedMeta = channelMeta[selectedChannelConfig.channel];

    return `Eres "${agentConfig.agent_name}", un asistente virtual del negocio.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}
Canal actual: ${selectedMeta.label}
Negocio: ${contextSummary.clinicName}
Zona horaria: ${contextSummary.timezone}

OBJETIVO:
${agentConfig.objective}

SERVICIOS DISPONIBLES:
${services.map((service) => `• ${service.name} — $${service.price} — ${service.description}`).join("\n") || "(sin servicios)"}
${agentConfig.treatments_text ? `\nTRATAMIENTOS:\n${agentConfig.treatments_text}` : ""}
${agentConfig.prices_text ? `\nPRECIOS:\n${agentConfig.prices_text}` : ""}
${agentConfig.locations_text ? `\nUBICACIONES:\n${agentConfig.locations_text}` : ""}
${agentConfig.professionals_text ? `\nPROFESIONALES:\n${agentConfig.professionals_text}` : ""}

CONTEXTO OPERATIVO REAL:
${contextSummary.branchesText}

DÍAS BLOQUEADOS ACTUALES:
${contextSummary.blockedDatesText}

MENSAJE DE BIENVENIDA:
${agentConfig.greeting}

REGLAS DEL NEGOCIO:
${agentConfig.special_instructions || "(sin reglas adicionales)"}

CONFIGURACIÓN DEL CANAL:
- Activo: ${selectedChannelConfig.enabled ? "Sí" : "No"}
- Límite de respuesta: ${selectedChannelConfig.max_response_length} caracteres
- Prompt adicional: ${selectedChannelConfig.additional_prompt || "(sin instrucciones adicionales)"}
- Mensaje de bienvenida por canal: ${selectedChannelConfig.welcome_message_enabled ? selectedChannelConfig.welcome_message || "(vacío)" : "desactivado"}
- Fallback: ${selectedChannelConfig.fallback_message || "(sin fallback)"}

GUARDRAILS DEL SISTEMA:
${systemGuardrails.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}`;
  };

  const handleSaveChannel = async () => {
    await saveChannel(selectedChannelConfig);
  };

  const handleResetChat = () => {
    setTestMessages([]);
    setTestInput("");
  };

  const handleSendTest = async () => {
    const content = testInput.trim();
    if (!content) return;

    const nextMessages: TestMessage[] = [
      ...testMessages,
      { id: crypto.randomUUID(), role: "user", content },
    ];

    setTestMessages(nextMessages);
    setTestInput("");
    setTesting(true);

    const { data, error } = await supabase.functions.invoke("ai-agent-preview", {
      body: {
        system_prompt: buildPromptPreview(),
        messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
      },
    });

    setTesting(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "No se pudo generar la respuesta de prueba");
      return;
    }

    setTestMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "assistant", content: data.reply || "Sin respuesta" },
    ]);
  };

  if (loading && localChannels.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Cargando laboratorio de prompts...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" /> Laboratorio de prompts
              </CardTitle>
              <CardDescription>
                Aquí concentras reglas, revisión visual y prueba controlada del agente antes de dejarlo responder solo.
              </CardDescription>
            </div>
            <Button onClick={onSaveBase} disabled={savingBase}>
              {savingBase ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar reglas base
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Reglas base del agente</Label>
            <Textarea
              value={agentConfig.special_instructions}
              onChange={(event) => onUpdateBase("special_instructions", event.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Escribe aquí exactamente cómo debe responder, qué debe evitar y cómo debe actuar al agendar."
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            La prueba usa lo que escribas aquí al instante. Para el canal seleccionado, los cambios locales también se reflejan en la simulación.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-primary" /> Canal y reglas específicas
              </CardTitle>
              <CardDescription>
                Ajusta cómo responde en cada canal sin salir de esta pestaña.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(channelMeta).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>{meta.emoji} {meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Autopilot activo en {channelMeta[selectedChannel].label}</p>
                  <p className="text-xs text-muted-foreground">Si está apagado, no responderá automáticamente en ese canal.</p>
                </div>
                <Switch
                  checked={selectedChannelConfig.enabled}
                  onCheckedChange={(value) => updateSelectedChannel({ enabled: value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Prompt adicional del canal</Label>
                <Textarea
                  value={selectedChannelConfig.additional_prompt}
                  onChange={(event) => updateSelectedChannel({ additional_prompt: event.target.value })}
                  rows={5}
                  placeholder="Ejemplo: en WhatsApp responde más corto, confirma disponibilidad antes de proponer horarios y nunca inventes feriados."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mensaje de bienvenida</Label>
                    <Switch
                      checked={selectedChannelConfig.welcome_message_enabled}
                      onCheckedChange={(value) => updateSelectedChannel({ welcome_message_enabled: value })}
                    />
                  </div>
                  <Textarea
                    value={selectedChannelConfig.welcome_message}
                    onChange={(event) => updateSelectedChannel({ welcome_message: event.target.value })}
                    rows={3}
                    disabled={!selectedChannelConfig.welcome_message_enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fallback controlado</Label>
                  <Textarea
                    value={selectedChannelConfig.fallback_message}
                    onChange={(event) => updateSelectedChannel({ fallback_message: event.target.value })}
                    rows={3}
                    placeholder="Respuesta segura cuando no pueda resolver algo."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Máximo de caracteres por respuesta</Label>
                <Input
                  type="number"
                  value={selectedChannelConfig.max_response_length}
                  min={100}
                  max={2000}
                  onChange={(event) => updateSelectedChannel({ max_response_length: parseInt(event.target.value, 10) || 500 })}
                  className="w-36"
                />
              </div>

              <Button onClick={handleSaveChannel} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar canal
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Guardrails visibles
              </CardTitle>
              <CardDescription>
                Reglas fijas para bajar alucinaciones y evitar respuestas fuera del flujo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-foreground">
                {systemGuardrails.map((rule) => (
                  <li key={rule} className="rounded-lg border border-border bg-muted/30 px-3 py-2">{rule}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Vista previa combinada
              </CardTitle>
              <CardDescription>
                Esto es lo que se usa como base para la simulación del agente en {channelMeta[selectedChannel].label}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[360px] rounded-lg border border-border bg-muted/40 p-4">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground font-mono">
                  {buildPromptPreview()}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-primary" /> Chat de prueba
                  </CardTitle>
                  <CardDescription>
                    Simula una conversación y revisa si responde como esperas antes de dejarlo en vivo.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleResetChat}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Limpiar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[320px] rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-3">
                  {testMessages.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      Escribe un mensaje como paciente. Ejemplo: “Quiero agendar para el 14 de abril por la tarde”.
                    </div>
                  )}

                  {testMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {testing && (
                    <div className="flex justify-start">
                      <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Probando respuesta...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="space-y-2">
                <Label>Mensaje de prueba</Label>
                <Textarea
                  value={testInput}
                  onChange={(event) => setTestInput(event.target.value)}
                  rows={3}
                  placeholder="Escribe como paciente para probar el comportamiento del agente."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSendTest} disabled={testing || !testInput.trim()}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                  Probar respuesta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromptStudioSection;