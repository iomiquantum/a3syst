import { useState, useRef, useEffect } from "react";
import { useClinic } from "@/hooks/useClinic";
import { useWhatsAppConversations, WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages, WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Search, MessageCircle, Check, CheckCheck, X,
  Phone, ArrowLeft, Loader2, Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const WhatsAppInbox = () => {
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const { conversations, loading: loadingConvs, markAsRead } = useWhatsAppConversations(clinicId);
  const { connections } = useWhatsAppConnections();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);

  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setSelectedConvId(conv.id);
    setShowMobileChat(true);
    if (conv.unread_count > 0) markAsRead(conv.id);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contact_name?.toLowerCase().includes(q) ||
      c.contact_phone.includes(q)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Conversations panel */}
      <div className={`w-full md:w-[35%] md:max-w-[400px] border-r flex flex-col ${showMobileChat ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              💬 WhatsApp
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs rounded-full">{totalUnread}</Badge>
              )}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/mi-cuenta?tab=integraciones")} title="Configuración WhatsApp">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Los mensajes de WhatsApp aparecerán aquí cuando los clientes te escriban
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b ${
                  selectedConvId === conv.id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(conv.contact_name || conv.contact_phone).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium truncate">
                      {conv.contact_name || conv.contact_phone}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview || "Sin mensajes"}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="h-5 min-w-[20px] flex items-center justify-center text-[10px] rounded-full bg-green-500 text-white ml-2 shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 flex flex-col ${showMobileChat ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <ChatPanel
            conversation={selectedConversation}
            clinicId={clinicId!}
            onBack={() => setShowMobileChat(false)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatPanelProps {
  conversation: WhatsAppConversation;
  clinicId: string;
  onBack: () => void;
}

const ChatPanel = ({ conversation, clinicId, onBack }: ChatPanelProps) => {
  const { messages, loading } = useWhatsAppMessages(conversation.id);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          clinic_id: clinicId,
          to: conversation.contact_phone,
          message: text,
          type: "text",
          connection_id: conversation.connection_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessageText("");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "sent": return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered": return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read": return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed": return <X className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getMessageContent = (msg: WhatsAppMessage): string => {
    if (msg.text_content) return msg.text_content;
    if (typeof msg.content === "object" && msg.content?.body) return msg.content.body as string;
    return `[${msg.message_type}]`;
  };

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{conversation.contact_name || conversation.contact_phone}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" /> {conversation.contact_phone}
          </p>
        </div>
        <Badge variant={conversation.status === "open" ? "default" : "secondary"} className="text-xs">
          {conversation.status}
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sin mensajes aún</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    msg.direction === "outbound"
                      ? "bg-green-100 dark:bg-green-900/40 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.message_type !== "text" && msg.message_type !== "button" && msg.message_type !== "interactive" && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {msg.message_type === "image" ? "📸" : msg.message_type === "audio" ? "🎤" : msg.message_type === "video" ? "🎬" : msg.message_type === "document" ? "📄" : msg.message_type === "location" ? "📍" : "📎"}{" "}
                      {msg.message_type}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{getMessageContent(msg)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                  </div>
                  {msg.status === "failed" && msg.error_message && (
                    <p className="text-[10px] text-red-500 mt-1">Error: {msg.error_message}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-muted/20">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Escribe un mensaje..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            size="icon"
            className="shrink-0 bg-green-600 hover:bg-green-700"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
};

export default WhatsAppInbox;
