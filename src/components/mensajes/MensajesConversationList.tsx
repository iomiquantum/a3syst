import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ConversationCard from "./ConversationCard";
import ActiveFilters from "./ActiveFilters";
import type { MockConversation } from "@/data/mockConversations";

interface FilterChip {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  conversations: MockConversation[];
  selectedId: string | null;
  onSelect: (c: MockConversation) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilters: FilterChip[];
  onRemoveFilter: (key: string) => void;
  loading?: boolean;
}

const MensajesConversationList = ({ conversations, selectedId, onSelect, searchQuery, onSearchChange, activeFilters, onRemoveFilter, loading }: Props) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 space-y-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar contacto..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
        <ActiveFilters filters={activeFilters} onRemove={onRemoveFilter} />
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay conversaciones en este filtro</p>
          </div>
        ) : (
          conversations.map(c => (
            <ConversationCard
              key={c.id}
              conversation={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
};

export default MensajesConversationList;
