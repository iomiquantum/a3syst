import { useState } from "react";
import { Send, Bot, User, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PipelineBadge from "./PipelineBadge";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import type { MockConversation } from "@/data/mockConversations";
import { MOCK_MESSAGES } from "@/data/mockConversations";

interface Props {
  conversation: MockConversation;
  onBack?: () => void;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

const MensajesChat = ({ conversation: c, onBack }: Props) => {
  const [input, setInput] = useState("");
  const [autopilot, setAutopilot] = useState(c.autopilotActive);
  const messages = MOCK_MESSAGES[c.id] || [];

  const pendingAction = () => toast.info("Acción pendiente de implementación");

  const handleSend = () => {
    if (!input.trim() || autopilot) return;
    toast.success("Mensaje enviado (mock)");
    setInput("");
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
              <PipelineBadge tab={c.pipelineTab} />
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <ChannelIcon channel={c.channel} size="sm" /> {c.channel === "whatsapp" ? "WhatsApp" : c.channel === "web" ? "Web" : c.channel}
              </span>
              {c.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-medium", autopilot ? "text-emerald-500" : "text-muted-foreground")}>
              Autopilot {autopilot ? "ON" : "OFF"}
            </span>
            <Switch checked={autopilot} onCheckedChange={setAutopilot} className="scale-75" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={pendingAction}>Marcar como no interesado</DropdownMenuItem>
              <DropdownMenuItem onClick={pendingAction}>Escalar a humano</DropdownMenuItem>
              <DropdownMenuItem onClick={pendingAction}>Convertir a cliente</DropdownMenuItem>
              <DropdownMenuItem onClick={pendingAction}>Reiniciar seguimiento</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={pendingAction}>Ver contacto en CRM</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes aún</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm",
                m.direction === "outbound"
                  ? m.sender === "ai"
                    ? "bg-muted border border-border"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                {m.sender === "ai" && m.direction === "outbound" && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="w-3 h-3 text-violet-500" />
                    <span className="text-[10px] font-medium text-violet-500">Asistente IA</span>
                  </div>
                )}
                <p className="leading-relaxed">{m.content}</p>
                <p className={cn("text-[10px] mt-1 text-right", m.direction === "outbound" && m.sender !== "ai" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatTime(m.time)}
                </p>
              </div>
            </div>
          ))}

          {/* Timer note */}
          {c.pipelineTab === "resueltos_ia" && (
            <p className="text-center text-[11px] text-muted-foreground italic py-2">
              Si no responde en 30 min pasa a Seguimiento C1
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        {autopilot ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm">
            <Bot className="w-4 h-4 text-violet-500 shrink-0" />
            La IA está respondiendo esta conversación...
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MensajesChat;
