import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FUNNEL_STAGES, Conversation } from "@/hooks/useMessaging";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  conversations: Conversation[];
  allConversations: Conversation[];
  selected: Conversation | null;
  funnelFilter: string;
  onSelect: (c: Conversation) => void;
  onFilterChange: (stage: string) => void;
}

const InboxSidebar = ({ conversations, allConversations, selected, funnelFilter, onSelect, onFilterChange }: Props) => {
  const [search, setSearch] = useState("");
  const [showFunnel, setShowFunnel] = useState(true);

  const filtered = search
    ? conversations.filter(c => c.contact?.name?.toLowerCase().includes(search.toLowerCase()) || c.contact?.phone?.includes(search))
    : conversations;

  const stageCounts = FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.key] = s.key === "todos" ? allConversations.length : allConversations.filter(c => c.contact?.funnel_stage === s.key).length;
    return acc;
  }, {} as Record<string, number>);

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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Etapas del embudo</p>
              {FUNNEL_STAGES.map(s => (
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
              ))}
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
            <p className="p-6 text-center text-sm text-muted-foreground">No hay conversaciones</p>
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
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-success-foreground fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{conv.contact?.name || "Sin nombre"}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview || "Sin mensajes"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">● {FUNNEL_STAGES.find(s => s.key === conv.contact?.funnel_stage)?.label || conv.contact?.funnel_stage}</span>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 rounded-full bg-success text-success-foreground text-[10px] font-bold flex items-center justify-center">{conv.unread_count}</span>
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
