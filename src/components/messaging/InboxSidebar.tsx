import { Search, Filter, Lock, Settings, ArrowUpCircle, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FUNNEL_STAGES, Conversation } from "@/hooks/useMessaging";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import ChannelIcon, { CHANNEL_LIST } from "@/components/messaging/ChannelIcon";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { Button } from "@/components/ui/button";

interface Props {
  conversations: Conversation[];
  allConversations: Conversation[];
  selected: Conversation | null;
  funnelFilter: string;
  channelFilter: string;
  onSelect: (c: Conversation) => void;
  onFilterChange: (stage: string) => void;
  onChannelFilterChange: (channel: string) => void;
}

// Channels that are always active (don't require setup)
const ALWAYS_ACTIVE = ["web_widget"];

// Free plan channels
const FREE_CHANNELS = ["web_widget", "whatsapp"];

// Channels requiring paid plan
const PAID_CHANNELS = ["instagram", "facebook", "tiktok"];

// Default first 3 funnel stages for guided setup
const STARTER_FUNNELS = [
  { key: "nuevos", label: "Nuevos", desc: "Personas que acaban de contactarte por primera vez", emoji: "👋" },
  { key: "interesada", label: "Interesados", desc: "Ya mostraron interés en tus servicios", emoji: "💬" },
  { key: "agendado", label: "Agendados", desc: "Ya tienen una cita programada contigo", emoji: "📅" },
];

const InboxSidebar = ({ conversations, allConversations, selected, funnelFilter, channelFilter, onSelect, onFilterChange, onChannelFilterChange }: Props) => {
  const [search, setSearch] = useState("");
  const [showFunnel, setShowFunnel] = useState(true);
  const [activeChannels, setActiveChannels] = useState<string[]>(["web_widget"]);
  const [funnelConfigured, setFunnelConfigured] = useState(false);
  const { clinicId } = useClinic();
  const navigate = useNavigate();

  // Check which channels are configured
  useEffect(() => {
    if (!clinicId) return;

    const checkChannels = async () => {
      const active = [...ALWAYS_ACTIVE];

      // Check WhatsApp connections
      const { data: waConns } = await (supabase as any)
        .from("whatsapp_connections")
        .select("status")
        .eq("clinic_id", clinicId)
        .eq("status", "active");

      if (waConns && waConns.length > 0) active.push("whatsapp");

      // Check channel_credentials for other channels
      const { data: creds } = await supabase
        .from("channel_credentials")
        .select("channel, is_active")
        .eq("clinic_id", clinicId)
        .eq("is_active", true);

      (creds || []).forEach((c: any) => {
        if (!active.includes(c.channel)) active.push(c.channel);
      });

      setActiveChannels(active);
    };

    checkChannels();
  }, [clinicId]);

  // Check if funnel stages have been used (conversations with non-default stages)
  useEffect(() => {
    const hasCustomStages = allConversations.some(
      c => c.contact?.funnel_stage && c.contact.funnel_stage !== "nuevos"
    );
    setFunnelConfigured(hasCustomStages || allConversations.length > 5);
  }, [allConversations]);

  const filtered = search
    ? conversations.filter(c => c.contact?.name?.toLowerCase().includes(search.toLowerCase()) || c.contact?.phone?.includes(search))
    : conversations;

  const stageCounts = FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.key] = s.key === "todos" ? allConversations.length : allConversations.filter(c => c.contact?.funnel_stage === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  const channelCounts: Record<string, number> = { todos: allConversations.length };
  allConversations.forEach(c => {
    const ch = c.channel || "whatsapp";
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });

  const initials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const timeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false, locale: es });
    } catch { return ""; }
  };

  const isChannelActive = (channelKey: string) => activeChannels.includes(channelKey);
  const isChannelFree = (channelKey: string) => FREE_CHANNELS.includes(channelKey);

  const handleLockedChannelClick = (channelKey: string) => {
    if (isChannelFree(channelKey)) {
      // Free channel but not configured → go to config
      if (channelKey === "whatsapp") {
        navigate("/configuracion/whatsapp");
      } else {
        navigate("/configuracion/canales");
      }
    } else {
      // Paid channel → upgrade plan
      navigate("/mi-cuenta");
    }
  };

  return (
    <div className="flex h-full">
      {/* Funnel stages sidebar */}
      {showFunnel && (
        <div className="w-48 border-r border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Buzón</span>
            <button onClick={() => setShowFunnel(false)} className="p-1 hover:bg-muted rounded">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {/* Channel filters */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Canales</p>
              <button
                onClick={() => onChannelFilterChange("todos")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors",
                  channelFilter === "todos" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                )}
              >
                <span className="truncate">Todos</span>
                <span className="text-xs text-muted-foreground">{channelCounts.todos || 0}</span>
              </button>

              {CHANNEL_LIST.map(ch => {
                const active = isChannelActive(ch.key);
                const isFree = isChannelFree(ch.key);

                if (active) {
                  return (
                    <button
                      key={ch.key}
                      onClick={() => onChannelFilterChange(ch.key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors",
                        channelFilter === ch.key ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={ch.key} size="sm" />
                        <span className="truncate">{ch.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{channelCounts[ch.key] || 0}</span>
                    </button>
                  );
                }

                // Locked channel
                return (
                  <button
                    key={ch.key}
                    onClick={() => handleLockedChannelClick(ch.key)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground/60 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="opacity-40">
                        <ChannelIcon channel={ch.key} size="sm" />
                      </span>
                      <span className="truncate">{ch.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isFree ? (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Configurar
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-0.5">
                          <ArrowUpCircle className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                      <Lock className="w-3 h-3 opacity-50" />
                    </div>
                  </button>
                );
              })}

              <div className="border-t border-border my-2" />

              {/* Funnel stages - show guided setup or regular list */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Etapas del embudo</p>

              {!funnelConfigured && allConversations.length <= 5 ? (
                /* Guided funnel setup panel */
                <div className="px-3 py-2 space-y-3">
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Tu primer embudo</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                      Los embudos te ayudan a organizar tus contactos según qué tan cerca están de convertirse en clientes.
                    </p>

                    {/* Show starter stages */}
                    <div className="space-y-2 mb-3">
                      {STARTER_FUNNELS.map((s, i) => (
                        <div key={s.key} className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <span className="text-base">{s.emoji}</span>
                            {i < STARTER_FUNNELS.length - 1 && (
                              <div className="w-px h-3 bg-border mt-1" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-foreground">{s.label}</p>
                            <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground mb-2 italic">
                      Estas etapas se activan automáticamente cuando empiezas a recibir mensajes. ¡Solo escribe a tus contactos!
                    </p>
                  </div>

                  {/* Quick filter shortcuts anyway */}
                  <button
                    onClick={() => onFilterChange("todos")}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors",
                      funnelFilter === "todos" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span>Ver todos</span>
                    <span className="text-[10px]">{stageCounts.todos || 0}</span>
                  </button>
                </div>
              ) : (
                /* Regular funnel stages list */
                FUNNEL_STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => onFilterChange(s.key)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors",
                      funnelFilter === s.key ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", 
                        s.key === "todos" ? "bg-primary" :
                        s.key === "agendado" || s.key === "paciente_1ra" || s.key === "paciente_tratamiento" ? "bg-success" :
                        s.key === "no_interesado" ? "bg-destructive" :
                        s.key === "no_responden" ? "bg-muted-foreground" :
                        "bg-accent"
                      )} />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{stageCounts[s.key] || 0}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 flex flex-col min-w-[280px]">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Conversaciones</span>
            {!showFunnel && (
              <button onClick={() => setShowFunnel(true)} className="p-1 hover:bg-muted rounded">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="text-4xl">💬</div>
              <p className="text-sm font-medium text-foreground">Aún no hay conversaciones</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los mensajes aparecerán aquí cuando alguien te escriba por el chat de tu página web o por WhatsApp.
              </p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate("/configuracion/widget")}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Configurar chat web
                </Button>
              </div>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 border-b border-border text-left transition-colors",
                  selected?.id === conv.id ? "bg-primary/5" : "hover:bg-muted/30"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 relative">
                  <span className="text-xs font-semibold text-accent">{initials(conv.contact?.name || "")}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center">
                    <ChannelIcon channel={conv.channel || "whatsapp"} size="sm" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{conv.contact?.name || "Sin nombre"}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview || "Sin mensajes"}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {conv.chatbot_active && conv.unread_count === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        🤖 IA respondiendo
                      </span>
                    ) : conv.unread_count > 0 && !conv.chatbot_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                        🔴 Necesita atención
                      </span>
                    ) : conv.unread_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">
                        ⚡ {conv.unread_count} nuevos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        ✅ Resuelto
                      </span>
                    )}
                    {(conv.follow_up_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                        📞 Contacto {conv.follow_up_count}
                      </span>
                    )}
                    {conv.last_inbound_at && (() => {
                      const mins = Math.floor((Date.now() - new Date(conv.last_inbound_at).getTime()) / 60000);
                      if (mins >= 30) {
                        const display = mins >= 1440 ? `${Math.floor(mins / 1440)}d` : mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
                        return <span className="text-[9px] text-muted-foreground">⏱ {display}</span>;
                      }
                      return null;
                    })()}
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ml-auto">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default InboxSidebar;