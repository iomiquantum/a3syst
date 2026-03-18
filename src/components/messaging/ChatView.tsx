import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Bot, Loader2, User, AlertTriangle, Check, CheckCheck, Clock, XCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, Message } from "@/hooks/useMessaging";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  conversation: Conversation;
  messages: Message[];
  sending: boolean;
  onSend: (content: string) => void;
  onToggleChatbot?: (conversationId: string, active: boolean) => void;
  onFollowUpSent?: (conversationId: string) => void;
}

// Cache for sender profile lookups
interface SenderProfile {
  name: string;
  role: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-3 h-3" />, label: "Pendiente", color: "text-muted-foreground/50" },
  sent: { icon: <Check className="w-3 h-3" />, label: "Enviado", color: "text-muted-foreground/70" },
  delivered: { icon: <CheckCheck className="w-3 h-3" />, label: "Entregado", color: "text-muted-foreground/70" },
  read: { icon: <CheckCheck className="w-3 h-3" />, label: "Leído", color: "text-blue-400" },
  received: { icon: <CheckCheck className="w-3 h-3" />, label: "Recibido", color: "text-muted-foreground/70" },
  failed: { icon: <AlertTriangle className="w-3 h-3" />, label: "Error al enviar", color: "text-destructive" },
  error: { icon: <XCircle className="w-3 h-3" />, label: "Error", color: "text-destructive" },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  secretary: "Secretaria",
  professional: "Profesional",
  empleado: "Empleado",
  vendedor: "Vendedor",
};

const ChatView = ({ conversation, messages, sending, onSend, onToggleChatbot, onFollowUpSent }: Props) => {
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { clinicId } = useClinic();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch sender profiles for outbound messages with sent_by
  useEffect(() => {
    const senderIds = [...new Set(
      messages
        .filter(m => m.direction === "outbound" && m.sent_by)
        .map(m => m.sent_by!)
    )].filter(id => !senderProfiles[id]);

    if (senderIds.length === 0) return;

    const fetchProfiles = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", senderIds);

      const newProfiles: Record<string, SenderProfile> = {};
      senderIds.forEach(id => {
        const profile = profiles?.find(p => p.user_id === id);
        const userRole = roles?.find(r => r.user_id === id);
        newProfiles[id] = {
          name: profile?.full_name || "Usuario",
          role: userRole?.role || "empleado",
        };
      });

      setSenderProfiles(prev => ({ ...prev, ...newProfiles }));
    };

    fetchProfiles();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAIReply = async () => {
    if (!clinicId || aiLoading) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-reply", {
        body: {
          conversation_id: conversation.id,
          clinic_id: clinicId,
          triggered_by: "manual",
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.skipped) {
        toast.message("La IA no respondió", { description: data.reason || "Esta conversación no pudo procesarse." });
      } else {
        toast.success("Respuesta IA enviada");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al generar respuesta IA");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!clinicId || followUpLoading) return;
    setFollowUpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-reply", {
        body: {
          conversation_id: conversation.id,
          clinic_id: clinicId,
          triggered_by: "follow_up",
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Seguimiento enviado (Contacto ${(conversation.follow_up_count || 0) + 1})`);
        onFollowUpSent?.(conversation.id);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al generar seguimiento");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const formatTime = (date: string) => {
    try { return format(new Date(date), "HH:mm", { locale: es }); } catch { return ""; }
  };

  const formatDate = (date: string) => {
    try { return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es }); } catch { return ""; }
  };

  const getMessageSender = (msg: Message): { type: "ai" | "human" | "contact"; label: string; role?: string } => {
    if (msg.direction === "inbound") {
      return { type: "contact", label: conversation.contact?.name || "Cliente" };
    }
    if (!msg.sent_by) {
      return { type: "ai", label: "Asistente IA" };
    }
    const profile = senderProfiles[msg.sent_by];
    if (profile) {
      const roleLabel = ROLE_LABELS[profile.role] || "Ejecutivo";
      return { type: "human", label: profile.name, role: roleLabel };
    }
    // If it's the current user
    if (user && msg.sent_by === user.id) {
      return { type: "human", label: "Tú" };
    }
    return { type: "human", label: "Ejecutivo" };
  };

  const getStatusIndicator = (msg: Message) => {
    if (msg.direction === "inbound") return null;
    const status = msg.status || "sent";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center", config.color)}>
              {config.icon}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {config.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const d = m.created_at.substring(0, 10);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.msgs.push(m);
    } else {
      grouped.push({ date: d, msgs: [m] });
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-4 border-b border-border flex items-center gap-3 bg-card shrink-0">
        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-xs font-semibold text-accent">
            {conversation.contact?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{conversation.contact?.name || "Sin nombre"}</p>
          <div className="flex items-center gap-2">
            <ChannelIcon channel={conversation.channel || "whatsapp"} size="sm" showLabel />
            <span className="text-xs text-muted-foreground">· {conversation.contact?.funnel_stage || "Nuevos"}</span>
            {(conversation.follow_up_count || 0) > 0 && (
              <span className="text-[10px] font-medium text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                Contacto {conversation.follow_up_count}
              </span>
            )}
            {conversation.last_inbound_at && (() => {
              const mins = Math.floor((Date.now() - new Date(conversation.last_inbound_at).getTime()) / 60000);
              if (mins >= 30) {
                const display = mins >= 1440 ? `${Math.floor(mins / 1440)}d` : mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
                return <span className="text-[10px] text-muted-foreground">⏱ Sin respuesta: {display}</span>;
              }
              return null;
            })()}
          </div>
        </div>
        {/* Autopilot toggle in header */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-medium", conversation.chatbot_active ? "text-emerald-500" : "text-muted-foreground")}>
            {conversation.chatbot_active ? "🤖 Autopilot" : "👤 Manual"}
          </span>
          <Switch
            checked={conversation.chatbot_active}
            onCheckedChange={(checked) => onToggleChatbot?.(conversation.id, checked)}
          />
        </div>
      </div>

      {/* Autopilot banner */}
      {conversation.chatbot_active && (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 shrink-0">
          <Bot className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            La IA está respondiendo esta conversación automáticamente
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">No hay mensajes en esta conversación</p>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="flex justify-center mb-3">
                <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formatDate(group.msgs[0].created_at)}
                </span>
              </div>
              {group.msgs.map(msg => {
                const sender = getMessageSender(msg);
                return (
                  <div key={msg.id} className={cn("flex mb-3", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                    {/* Contact avatar for inbound */}
                    {msg.direction === "inbound" && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2 mt-1 shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[75%] min-w-[80px] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.direction === "outbound"
                        ? sender.type === "ai"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    )}>
                      {/* Sender badge */}
                      {msg.direction === "outbound" && (
                        <div className={cn(
                          "flex items-center gap-1 mb-1 text-[10px] font-medium",
                          sender.type === "ai" ? "text-violet-200" : "text-primary-foreground/70"
                        )}>
                          {sender.type === "ai" ? (
                            <><Bot className="w-3 h-3" /> {sender.label}</>
                          ) : (
                            <><User className="w-3 h-3" /> {sender.label}{sender.role && <span className="opacity-60 ml-1">· {sender.role}</span>}</>
                          )}
                        </div>
                      )}
                      {msg.direction === "inbound" && (
                        <div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-muted-foreground">
                          <User className="w-3 h-3" /> {sender.label}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words overflow-hidden">{msg.content}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.direction === "outbound"
                          ? sender.type === "ai" ? "text-violet-200/70" : "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                        {getStatusIndicator(msg)}
                      </div>
                    </div>
                    {/* Sender icon for outbound */}
                    {msg.direction === "outbound" && (
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center ml-2 mt-1 shrink-0",
                        sender.type === "ai" ? "bg-violet-500/20" : "bg-primary/20"
                      )}>
                        {sender.type === "ai" ? (
                          <Bot className="w-3 h-3 text-violet-500" />
                        ) : (
                          <User className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-3 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-emerald-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            {conversation.contact?.phone}
          </span>
          {conversation.chatbot_active && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              🤖 Autopilot ON
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleAIReply}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
            {aiLoading ? "Pensando..." : "Respuesta IA"}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={conversation.chatbot_active ? "Escribe para intervenir manualmente..." : "Escribe un mensaje..."}
              rows={1}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-2 rounded-lg hover:bg-muted"><Smile className="w-4 h-4 text-muted-foreground" /></button>
            <button className="p-2 rounded-lg hover:bg-muted"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
            <Button size="sm" onClick={handleSend} disabled={!input.trim() || sending} className="gradient-primary text-primary-foreground h-9 px-4">
              Enviar <Send className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;