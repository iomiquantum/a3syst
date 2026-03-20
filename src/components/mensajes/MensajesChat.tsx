import { useState, useRef, useEffect } from "react";
import { Send, Bot, MoreVertical, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PipelineBadge from "./PipelineBadge";
import PipelineProgressBar from "./PipelineProgressBar";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import ChatToolbar from "./ChatToolbar";
import { usePipelineAction } from "@/hooks/usePipelineAction";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { useClinicTemplate } from "@/hooks/useClinicTemplate";
import ClinicChatActions from "./ClinicChatActions";
import AppointmentBanner from "./AppointmentBanner";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";

interface Props {
  conversation: PipelineConversation;
  onBack?: () => void;
  onActionComplete?: () => void;
  showContactPanel?: boolean;
  onToggleContactPanel?: () => void;
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
  created_at: string;
  status: string;
}

const MensajesChat = ({ conversation: c, onBack, onActionComplete, showContactPanel, onToggleContactPanel }: Props) => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const { moveConversation } = usePipelineAction();
  const { templateSlug } = useClinicTemplate();
  const [input, setInput] = useState("");
  const [autopilot, setAutopilot] = useState(c.chatbot_active);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      try {
        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            clinic_id: clinicId,
            to_number: c.contactPhone,
            message_type: "text",
            content: input.trim(),
            sent_by: user?.id || null,
            conversation_id: c.id,
          },
        });
        if (error) throw error;
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

  const isBotMessage = (m: ChatMessage) => m.direction === "outbound" && !m.sent_by;

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
              {c.contactTags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3 max-w-2xl mx-auto">
          {loadingMsgs && <p className="text-center text-sm text-muted-foreground py-8">Cargando mensajes...</p>}
          {!loadingMsgs && messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes aún</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm",
                m.direction === "outbound"
                  ? isBotMessage(m)
                    ? "bg-muted border border-border"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                {isBotMessage(m) && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="w-3 h-3 text-violet-500" />
                    <span className="text-[10px] font-medium text-violet-500">Asistente IA</span>
                  </div>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className={cn("text-[10px] mt-1 text-right", m.direction === "outbound" && !isBotMessage(m) ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {c.pipeline_tab === "resueltos_ia" && (
            <p className="text-center text-[11px] text-muted-foreground italic py-2">
              Si no responde en 30 min pasa a Seguimiento C1
            </p>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
        {/* Autopilot banner — informational only, does NOT block input */}
        {autopilot && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs">
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>La IA está respondiendo esta conversación. Puedes enviar mensajes como humano sin desactivarla.</span>
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
      </div>
    </div>
  );
};

export default MensajesChat;
