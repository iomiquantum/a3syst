import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Bot, Loader2, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, Message } from "@/hooks/useMessaging";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Props {
  conversation: Conversation;
  messages: Message[];
  sending: boolean;
  onSend: (content: string) => void;
  onToggleChatbot?: (conversationId: string, active: boolean) => void;
}

const ChatView = ({ conversation, messages, sending, onSend, onToggleChatbot }: Props) => {
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { clinicId } = useClinic();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sending || conversation.chatbot_active) return;
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
        body: { conversation_id: conversation.id, clinic_id: clinicId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al generar respuesta IA");
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (date: string) => {
    try { return format(new Date(date), "HH:mm", { locale: es }); } catch { return ""; }
  };

  const formatDate = (date: string) => {
    try { return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es }); } catch { return ""; }
  };

  // Determine if an outbound message was sent by AI or human
  const getMessageSender = (msg: Message): "ai" | "human" | "contact" => {
    if (msg.direction === "inbound") return "contact";
    // If sent_by is null and it's outbound, likely AI
    if (!msg.sent_by) return "ai";
    return "human";
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
                        ? sender === "ai"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    )}>
                      {/* Sender badge for outbound */}
                      {msg.direction === "outbound" && (
                        <div className={cn(
                          "flex items-center gap-1 mb-1 text-[10px] font-medium",
                          sender === "ai" ? "text-violet-200" : "text-primary-foreground/70"
                        )}>
                          {sender === "ai" ? (
                            <><Bot className="w-3 h-3" /> Asistente IA</>
                          ) : (
                            <><User className="w-3 h-3" /> Tú</>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words overflow-hidden">{msg.content}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.direction === "outbound"
                          ? sender === "ai" ? "text-violet-200/70" : "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                        {msg.direction === "outbound" && (
                          <span className="text-[10px]">{msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}</span>
                        )}
                      </div>
                    </div>
                    {/* Sender icon for outbound */}
                    {msg.direction === "outbound" && (
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center ml-2 mt-1 shrink-0",
                        sender === "ai" ? "bg-violet-500/20" : "bg-primary/20"
                      )}>
                        {sender === "ai" ? (
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
        {conversation.chatbot_active ? (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span className="text-xs">Autopilot activo — desactívalo para escribir manualmente</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-emerald-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                {conversation.contact?.phone}
              </span>
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
                  placeholder="Escribe un mensaje..."
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
          </>
        )}
      </div>
    </div>
  );
};

export default ChatView;
