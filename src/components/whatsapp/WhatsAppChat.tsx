import { useState, useEffect, useRef, useMemo } from "react";
import { useWhatsApp, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Send, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const ago = (d: string) => {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: false, locale: es });
  } catch {
    return "";
  }
};

const getMessageText = (msg: WhatsAppMessage): string => {
  if (!msg.content) return "";
  const c = msg.content as any;
  if (typeof c === "string") return c;
  if (c.text?.body) return c.text.body;
  if (c.body) return c.body;
  if (c.type === "image") return "📷 Imagen";
  if (c.type === "document") return "📄 Documento";
  if (c.type === "audio") return "🎤 Audio";
  if (c.type === "video") return "🎥 Video";
  return JSON.stringify(c).substring(0, 50);
};

interface Conversation {
  contactNumber: string;
  contactName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: WhatsAppMessage[];
}

const WhatsAppChat = () => {
  const { messages, loadingMessages, isConnected, sendMessage, connections } = useWhatsApp();
  const { clinicId } = useClinic();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Group messages into conversations
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const msg of sorted) {
      const contactNum = msg.direction === "inbound" ? msg.from_number : msg.to_number;
      if (!map.has(contactNum)) {
        map.set(contactNum, {
          contactNumber: contactNum,
          contactName: contactNum,
          lastMessage: "",
          lastTime: msg.created_at,
          unread: 0,
          messages: [],
        });
      }
      const conv = map.get(contactNum)!;
      conv.messages.push(msg);
      conv.lastMessage = getMessageText(msg);
      conv.lastTime = msg.created_at;
      if (msg.direction === "inbound" && msg.status !== "read") {
        conv.unread++;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );
  }, [messages]);

  const filteredConversations = conversations.filter(
    c => c.contactNumber.includes(search) || c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = conversations.find(c => c.contactNumber === activeContact);

  // Realtime subscription
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("wa-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `clinic_id=eq.${clinicId}` },
        () => {
          // React Query will refetch, but we can force it
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeContact) return;
    sendMessage.mutate({
      to_number: activeContact,
      message_type: "text",
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Not connected banner
  if (!isConnected && !loadingMessages) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#25d366]/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-[#25d366]/60" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Conecta tu WhatsApp primero</h2>
          <p className="text-muted-foreground text-sm">
            Para enviar y recibir mensajes necesitas conectar tu número de WhatsApp Business
          </p>
          <Button
            onClick={() => navigate("/configuracion/whatsapp")}
            className="bg-[#25d366] hover:bg-[#25d366]/90 text-white"
          >
            Conectar WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0f]">
      {/* Left: Conversation List */}
      <div className="w-80 border-r border-white/10 flex flex-col shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contacto..."
              className="pl-9 bg-white/[0.03] border-white/10 text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No hay conversaciones
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.contactNumber}
                onClick={() => setActiveContact(conv.contactNumber)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors border-b border-white/5",
                  activeContact === conv.contactNumber
                    ? "bg-[#7c3aed]/10 border-l-2 border-l-[#7c3aed]"
                    : "hover:bg-white/[0.03]"
                )}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-[#25d366]/20 text-[#25d366] text-sm font-bold">
                    {conv.contactName.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{conv.contactName}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{ago(conv.lastTime)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#25d366] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-[#25d366]/20 text-[#25d366] text-xs font-bold">
                  {activeConv.contactName.slice(-2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeConv.contactName}</p>
                <p className="text-[10px] text-muted-foreground">{activeConv.contactNumber}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeConv.messages.map(msg => {
                const isOutbound = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5",
                      isOutbound
                        ? "bg-[#7c3aed] text-white rounded-br-md"
                        : "bg-[#1a1a2e] text-foreground rounded-bl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{getMessageText(msg)}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isOutbound ? "text-white/50" : "text-muted-foreground"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-white/[0.03] border-white/10"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessage.isPending}
                size="icon"
                className="bg-[#25d366] hover:bg-[#25d366]/90 text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;
