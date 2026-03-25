import { useState, useRef, useEffect } from "react";
import { Send, Bot, MoreVertical, PanelRightOpen, PanelRightClose, LayoutTemplate, ShieldAlert, Lock, ClipboardList, UserX, PhoneOff, RotateCcw, CalendarPlus, MessageSquareText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PipelineBadge from "./PipelineBadge";
import WhatsAppWindowBadge from "./WhatsAppWindowBadge";
import PipelineProgressBar from "./PipelineProgressBar";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import ChatToolbar from "./ChatToolbar";
import MessageStatusIcon from "./MessageStatusIcon";
import AntiSpamBadge from "./AntiSpamBadge";
import { usePipelineAction } from "@/hooks/usePipelineAction";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAgentName } from "@/hooks/useAgentName";
import { useAuth } from "@/hooks/useAuth";
import { useClinicTemplate } from "@/hooks/useClinicTemplate";
import ClinicChatActions from "./ClinicChatActions";
import AppointmentBanner from "./AppointmentBanner";
import WhatsAppTemplateDialog from "./WhatsAppTemplateDialog";
import ChatTrainingDialog from "./ChatTrainingDialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";

interface Props {
  conversation: PipelineConversation;
  onBack?: () => void;
  onActionComplete?: () => void;
  showContactPanel?: boolean;
  onToggleContactPanel?: () => void;
}

const WHATSAPP_ERROR_MAP: Record<string, string> = {
  "131042": "Problema de facturación — Revisa el método de pago en Meta Business Manager.",
  "131047": "Ventana de 24h cerrada — El cliente no ha escrito recientemente. Usa un template aprobado.",
  "131026": "El mensaje no pudo ser entregado — El destinatario posiblemente no tiene WhatsApp activo.",
  "131045": "El número de teléfono no está registrado en WhatsApp.",
  "131049": "Límite de frecuencia — Este contacto ya recibió demasiados mensajes de marketing.",
  "131051": "El template de marketing fue bloqueado por límite de frecuencia del destinatario.",
  "131053": "El contacto no tiene opt-in para recibir mensajes de marketing.",
  "131056": "Velocidad de envío excedida — Espera unos minutos e intenta de nuevo.",
  "131048": "Spam detectado — Meta bloqueó este mensaje por posible contenido spam.",
  "131031": "La cuenta de WhatsApp Business no es válida para enviar mensajes.",
  "131009": "Parámetro no válido — Verifica el formato del número o los datos del template.",
  "131021": "El destinatario no puede recibir este tipo de mensaje.",
  "131005": "Acceso denegado — El token no tiene permisos para esta operación.",
  "130472": "El número de destino tiene demasiadas conversaciones abiertas. Intenta más tarde.",
  "132000": "El template tiene parámetros faltantes o incorrectos.",
  "132001": "El template no existe o no está aprobado.",
  "132005": "Los parámetros del template no coinciden con la plantilla.",
  "132012": "Componente del template no soportado.",
  "132015": "Template pausado por baja calidad.",
  "132016": "Template deshabilitado por baja calidad.",
  "133004": "El servidor de WhatsApp no está disponible temporalmente.",
  "133010": "El número no tiene WhatsApp — El destinatario no tiene la aplicación instalada.",
  "135000": "Error genérico de WhatsApp — Intenta de nuevo más tarde.",
  "190": "Token expirado o inválido — Se requiere reconectar WhatsApp.",
  "80007": "Límite de llamadas a la API excedido — Espera unos minutos.",
  "100": "Parámetro requerido faltante en la solicitud.",
};

function getWhatsAppErrorDescription(errorCode: string | null, errorMessage: string | null): string {
  if (errorCode && WHATSAPP_ERROR_MAP[errorCode]) {
    return WHATSAPP_ERROR_MAP[errorCode];
  }
  if (errorMessage) {
    return errorMessage;
  }
  return "Error desconocido al entregar el mensaje. Verifica la conexión de WhatsApp.";
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

interface ChatMessage {
  id: string;
  direction: string;
  content: string;
  sent_by: string | null;
  message_type: string;
  media_url: string | null;
  created_at: string;
  status: string;
  origin: string | null;
  error_code: string | null;
  error_message: string | null;
}

const MensajesChat = ({ conversation: c, onBack, onActionComplete, showContactPanel, onToggleContactPanel }: Props) => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const { agentName } = useAgentName();
  const { moveConversation } = usePipelineAction();
  const { templateSlug } = useClinicTemplate();
  const [input, setInput] = useState("");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [autopilot, setAutopilot] = useState(c.chatbot_active);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [windowJustClosed, setWindowJustClosed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate window status from last_client_message_at OR explicit block flag
  const lastClientAt = (c as any).last_client_message_at;
  const windowExpiredByTime = c.channel === "whatsapp" && lastClientAt
    ? (Date.now() - new Date(lastClientAt).getTime()) > 24 * 60 * 60 * 1000
    : false;
  const isWhatsAppBlocked = c.channel === "whatsapp" && (Boolean((c as any).whatsapp_window_blocked) || windowExpiredByTime || windowJustClosed);

  // Fetch real messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true });
      if (!error) setMessages((data || []) as ChatMessage[]);
      setLoadingMsgs(false);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${c.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${c.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as any).id)) return prev;
          return [...prev, payload.new as ChatMessage];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${c.id}`,
      }, (payload) => {
        setMessages(prev => prev.map(m =>
          m.id === (payload.new as any).id ? { ...m, status: (payload.new as any).status, error_code: (payload.new as any).error_code, error_message: (payload.new as any).error_message } : m
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [c.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Toggle autopilot
  const handleToggleAutopilot = async (active: boolean) => {
    setAutopilot(active);
    await (supabase as any).from("conversations").update({ chatbot_active: active }).eq("id", c.id);
    toast.success(active ? "Autopilot activado" : "Autopilot desactivado");
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending || !clinicId) return;
    setSending(true);

    const channel = c.channel || "whatsapp";
    if (channel === "whatsapp" && c.contactPhone) {
      if (isWhatsAppBlocked) {
        toast.info("La ventana de 24h está cerrada. Usa un template aprobado para responder.");
        setTemplateDialogOpen(true);
        setSending(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            clinic_id: clinicId,
            to_number: c.contactPhone,
            message_type: "text",
            content: input.trim(),
            sent_by: user?.id || null,
            conversation_id: c.id,
            origin: `human|${c.pipeline_tab || "inbox"}`,
          },
        });
        if (error) throw error;
        // Check for window_closed error from edge function
        if (data?.error === "window_closed") {
          setWindowJustClosed(true);
          toast.error("⚠️ La ventana de 24h está cerrada. El mensaje no se pudo enviar. Usa un template aprobado.", { duration: 6000 });
          setTemplateDialogOpen(true);
          setSending(false);
          return;
        }
        if (data?.error) throw new Error(data.error);
      } catch (e: any) {
        toast.error(e.message || "Error al enviar");
      }
    } else {
      await supabase.from("messages").insert({
        conversation_id: c.id,
        clinic_id: clinicId,
        direction: "outbound",
        content: input.trim(),
        message_type: "text",
        status: "sent",
        sent_by: user?.id || null,
        origin: `human|${c.pipeline_tab || "inbox"}`,
      });
    }

    setInput("");
    setSending(false);
  };

  const handleAction = async (tab: string, reason?: string, metadata?: Record<string, any>) => {
    await moveConversation(c.id, tab, reason, metadata);
    onActionComplete?.();
  };

  const handleInsertText = (text: string) => {
    setInput(prev => prev + text);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const isBotMessage = (m: ChatMessage) => {
    if (m.direction !== "outbound") return false;
    const origin = m.origin || "";
    const sender = origin.split("|")[0] || (m.sent_by ? "human" : "ai_auto");
    return sender !== "human";
  };

  const formatPipelineTab = (tab: string): string => {
    if (!tab || tab === "inbox") return "";
    if (tab.startsWith("seguimiento_s")) return tab.replace("seguimiento_s", "S");
    const labels: Record<string, string> = {
      resueltos_ia: "Resueltos IA",
      no_responden: "No responden",
      no_interesado: "No interesado",
      agendados: "Agendados",
      pacientes: "Pacientes",
      perdidos: "Perdidos",
      escalados: "Escalados",
    };
    return labels[tab] || tab;
  };

  const getOriginLabel = (m: ChatMessage): { text: string; color: string } | null => {
    if (m.direction !== "outbound") return null;
    const raw = m.origin || (m.sent_by ? "human|unknown" : "ai_auto|unknown");
    const [sender, stage] = raw.split("|");
    const stageLabel = formatPipelineTab(stage || "");
    const stageTag = stageLabel ? ` · ${stageLabel}` : "";

    if (sender === "human") return { text: `👤 Humano${stageTag}`, color: "text-blue-500" };
    if (sender === "ai_auto_s5" || sender === "ai_auto_s6") return { text: `🤖 IA respondiendo en ${stageLabel || sender.replace("ai_auto_", "").toUpperCase()}`, color: "text-purple-500" };
    if (sender === "ai_auto" || sender === "ai_agent") return { text: `🤖 ${agentName}${stageTag}`, color: "text-violet-500" };
    if (sender.startsWith("follow_up_s")) {
      const num = sender.replace("follow_up_s", "");
      // Don't repeat stage if it matches the follow-up number (e.g. "S5 · S5")
      const followUpStage = `seguimiento_s${num}`;
      const extraStage = stage && stage !== followUpStage ? ` · ${formatPipelineTab(stage)}` : "";
      return { text: `🔄 Seguimiento S${num}${extraStage}`, color: "text-amber-500" };
    }
    if (sender === "appointment_flow") return { text: `📅 Flujo de cita${stageTag}`, color: "text-emerald-500" };
    if (sender === "reminder") return { text: `⏰ Recordatorio${stageTag}`, color: "text-orange-500" };
    if (sender === "system") return { text: `⚙️ Sistema${stageTag}`, color: "text-muted-foreground" };
    if (sender === "system_summary") return { text: `📋 Resumen IA${stageTag}`, color: "text-primary" };
    return { text: `🤖 ${agentName}${stageTag}`, color: "text-violet-500" };
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {getInitials(c.contactName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{c.contactName}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <PipelineBadge tab={c.pipeline_tab} />
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <ChannelIcon channel={c.channel} size="sm" /> {c.channel === "whatsapp" ? "WhatsApp" : c.channel === "web" ? "Web" : c.channel}
              </span>
              <WhatsAppWindowBadge
                lastClientMessageAt={(c as any).last_client_message_at}
                channel={c.channel}
                isBlocked={(c as any).whatsapp_window_blocked}
              />
              {c.contactTags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
            {/* Pipeline Progress Bar */}
            {(c.seguimiento_last_completed_s > 0 || c.seguimiento_next_s > 0) && (
              <PipelineProgressBar
                lastCompletedS={c.seguimiento_last_completed_s}
                nextS={c.seguimiento_next_s}
                currentTab={c.pipeline_tab}
                isRecurrente={c.seguimiento_is_recurrente}
                recurrenteCount={c.seguimiento_recurrente_count}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClinicChatActions
            pipelineTab={c.pipeline_tab}
            templateSlug={templateSlug}
            onMove={(tab, reason, meta) => handleAction(tab, reason, meta)}
          />
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-medium", autopilot ? "text-emerald-500" : "text-muted-foreground")}>
              Autopilot {autopilot ? "ON" : "OFF"}
            </span>
            <Switch checked={autopilot} onCheckedChange={handleToggleAutopilot} className="scale-75" />
          </div>
          {onToggleContactPanel && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleContactPanel} title={showContactPanel ? "Ocultar ficha" : "Ver ficha de contacto"}>
              {showContactPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAction("no_interesado")}>Marcar como no interesado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("escalados")}>Escalar a humano</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("pacientes")}>Convertir a paciente</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("resueltos_ia")}>Reiniciar seguimiento</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Ir a CRM (pendiente)")}>Ver contacto en CRM</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Appointment Banner */}
      <AppointmentBanner conversation={c} onActionComplete={onActionComplete} />

      {/* Anti-spam Banner */}
      {c.pipeline_tab === "no_responden" && (c as any).seguimiento_spam_protection_triggered && (
        <AntiSpamBadge
          consecutiveReadNoReply={(c as any).seguimiento_consecutive_read_no_reply || 0}
          spamProtectionTriggered={true}
          spamJumpedFromS={(c as any).seguimiento_spam_jumped_from_s}
          variant="banner"
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3 max-w-2xl mx-auto">
          {loadingMsgs && <p className="text-center text-sm text-muted-foreground py-8">Cargando mensajes...</p>}
          {!loadingMsgs && messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes aún</p>
          )}
          {messages.map(m => {
            // System note — AI summary for human agent
            if (m.message_type === "system_note") {
              return (
                <div key={m.id} className="mx-auto max-w-md">
                  <div className="bg-accent/50 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Resumen IA para agente</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">{m.content}</p>
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] text-muted-foreground font-medium mb-2">Acciones rápidas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => setTemplateDialogOpen(true)}
                        >
                          <LayoutTemplate className="w-3 h-3" /> Enviar template
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => textareaRef.current?.focus()}
                        >
                          <MessageSquareText className="w-3 h-3" /> Escribir mensaje
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => handleAction("seguimiento_s1")}
                        >
                          <RotateCcw className="w-3 h-3" /> Reiniciar S1
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => handleAction("no_responden")}
                        >
                          <PhoneOff className="w-3 h-3" /> No responden
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => handleAction("no_interesado")}
                        >
                          <UserX className="w-3 h-3" /> No interesado
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 gap-1"
                          onClick={() => handleAction("agendados")}
                        >
                          <CalendarPlus className="w-3 h-3" /> Agendar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Normal message bubble
            return (
            <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm",
                m.direction === "outbound"
                  ? isBotMessage(m)
                    ? "bg-muted border border-border"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                {m.direction === "outbound" && (() => {
                  const label = getOriginLabel(m);
                  return label ? (
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-[9px] font-medium ${label.color}`}>{label.text}</span>
                    </div>
                  ) : null;
                })()}
                {/* Audio / voice note player */}
                {(m.message_type === "audio" || m.message_type === "voice") ? (
                  <div className="mb-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                      <span>🎙️ Nota de voz</span>
                    </div>
                    {m.media_url && !m.media_url.match(/^\d+$/) ? (
                      <>
                        <audio controls preload="metadata" className="max-w-[250px]" onError={(e) => {
                          console.error("Audio playback error:", e);
                          (e.target as HTMLAudioElement).style.display = 'none';
                          const fallback = (e.target as HTMLAudioElement).nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}>
                          <source src={m.media_url} type="audio/ogg; codecs=opus" />
                          <source src={m.media_url} type="audio/ogg" />
                          <source src={m.media_url} type="audio/mpeg" />
                          Tu navegador no soporta reproducción de audio.
                        </audio>
                        <div className="hidden items-center gap-1 text-[10px] text-destructive">
                          <span>⚠️ No se pudo reproducir el audio</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                        <span>🎤 Nota de voz (audio no disponible para reproducción)</span>
                      </div>
                    )}
                    {m.content && m.content !== "[Audio]" && m.content !== "[audio]" && m.content !== "[voice]" && (
                      <div className="mt-1.5 px-2 py-1.5 rounded bg-muted/50 border border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">📝 Transcripción:</p>
                        <p className="leading-relaxed whitespace-pre-wrap text-xs">{m.content.replace(/^🎤 Nota de voz transcrita:\s*/i, "")}</p>
                      </div>
                    )}
                    {(!m.content || m.content === "[Audio]" || m.content === "[audio]" || m.content === "[voice]") && (
                      <p className="text-[10px] text-muted-foreground/60 italic mt-1">Sin transcripción disponible</p>
                    )}
                  </div>
                ) : m.media_url && (m.message_type === "image" || m.message_type === "sticker") ? (
                  <img src={m.media_url} alt="media" className="max-w-full rounded-lg mb-1" loading="lazy" />
                ) : m.media_url && m.message_type === "video" ? (
                  <video controls preload="metadata" className="max-w-full rounded-lg mb-1">
                    <source src={m.media_url} />
                  </video>
                ) : m.media_url && m.message_type === "document" ? (
                  <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-primary">
                    📎 Ver documento adjunto
                  </a>
                ) : null}
                {/* Text content (skip for audio-only) */}
                {!(m.message_type === "audio" || m.message_type === "voice") && (
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                )}
                <div className={cn("flex items-center justify-end gap-1 mt-1", m.direction === "outbound" && !isBotMessage(m) ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  <span className="text-[10px]">
                    {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {m.direction === "outbound" && <MessageStatusIcon status={m.status} />}
                </div>
                {m.status === "failed" && (
                  <div className="mt-1 rounded bg-destructive/10 border border-destructive/20 px-2 py-1.5 space-y-0.5">
                    <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                      ❌ Mensaje no entregado {m.error_code ? `(${m.error_code})` : ""}
                    </p>
                    <p className="text-[10px] text-destructive/80">
                      {getWhatsAppErrorDescription(m.error_code, m.error_message)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })}

          {c.pipeline_tab === "resueltos_ia" && (
            <p className="text-center text-[11px] text-muted-foreground italic py-2">
              Si no responde en 15 min pasa a Seguimiento S1
            </p>
          )}

          {/* WhatsApp window closed alert for manual stages */}
          {c.channel === "whatsapp" && (c.pipeline_tab === "seguimiento_s5" || c.pipeline_tab === "seguimiento_s6") && (c as any).whatsapp_window_blocked && (
            <div className="mx-auto max-w-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-center space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ La ventana de WhatsApp está cerrada.
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                El cliente no ha escrito en más de 24 horas. Al enviar, se usará un template para reabrir la conversación.
              </p>
              <Button size="sm" onClick={() => setTemplateDialogOpen(true)}>
                <LayoutTemplate className="w-4 h-4" />
                Elegir template aprobado
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
        {/* Autopilot banner — informational only, does NOT block input */}
        {autopilot && !isWhatsAppBlocked && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs">
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>La IA está respondiendo esta conversación. Puedes enviar mensajes como humano sin desactivarla.</span>
          </div>
        )}

        {(c.pipeline_tab === "seguimiento_s5" || c.pipeline_tab === "seguimiento_s6") && autopilot && !isWhatsAppBlocked && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs border border-purple-200 dark:border-purple-500/20">
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>🤖 La IA está respondiendo en esta etapa de seguimiento manual ({c.pipeline_tab === "seguimiento_s5" ? "S5" : "S6"}). El contacto NO se moverá a Resueltos IA.</span>
          </div>
        )}

        {/* WhatsApp window BLOCKED — replace entire input with template-only mode */}
        {isWhatsAppBlocked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-medium">🔒 Ventana de WhatsApp cerrada — No puedes enviar mensajes normales</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Han pasado más de 24h desde el último mensaje del contacto. Envía un template aprobado para reabrir la conversación.
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Enviar template aprobado para reabrir conversación
            </Button>
          </div>
        ) : (
          <>
            {c.channel === "whatsapp" && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">Templates aprobados de WhatsApp</p>
                  <p className="text-[11px] text-muted-foreground">
                    Consulta y envía templates aprobados del negocio activo desde el buzón.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setTemplateDialogOpen(true)}
                >
                  <LayoutTemplate className="w-4 h-4" />
                  Ver templates
                </Button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <ChatToolbar
                  onInsertText={handleInsertText}
                  conversationId={c.id}
                  clinicId={clinicId || ""}
                />
                <Textarea
                  ref={textareaRef}
                  placeholder="Escribe un mensaje... (Shift+Enter para nueva línea)"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="min-h-[40px] max-h-[120px] text-sm resize-none py-2"
                  rows={1}
                />
              </div>
              <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon" className="shrink-0 h-10 w-10">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <WhatsAppTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        clinicId={clinicId || ""}
        conversationId={c.id}
        toNumber={c.contactPhone}
        contactName={c.contactName}
      />
    </div>
  );
};

export default MensajesChat;
