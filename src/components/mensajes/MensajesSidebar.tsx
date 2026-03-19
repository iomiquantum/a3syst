import { useState } from "react";
import { Search, MessageSquare, Globe, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ALL_TAGS, MockConversation } from "@/data/mockConversations";

interface Props {
  conversations: MockConversation[];
  selectedChannel: string;
  onChannelChange: (ch: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const CHANNELS = [
  { key: "todos", label: "Todos", icon: null },
  { key: "whatsapp", label: "WhatsApp", connected: true },
  { key: "web", label: "Web", connected: true },
  { key: "instagram", label: "Instagram", connected: false },
  { key: "facebook", label: "Facebook", connected: false },
  { key: "tiktok", label: "TikTok", connected: false },
];

const MensajesSidebar = ({ conversations, selectedChannel, onChannelChange, selectedTags, onTagsChange }: Props) => {
  const [tagSearch, setTagSearch] = useState("");

  const channelCounts = (ch: string) => {
    if (ch === "todos") return conversations.length;
    return conversations.filter(c => c.channel === ch).length;
  };

  const tagCounts = (tag: string) => conversations.filter(c => c.tags.includes(tag)).length;

  const filteredTags = tagSearch.trim()
    ? ALL_TAGS.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : ALL_TAGS;

  const toggleTag = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const TAG_COLORS = ["bg-violet-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400", "bg-cyan-400", "bg-orange-400"];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Canales */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Canales</p>
          <div className="space-y-0.5">
            {CHANNELS.map(ch => (
              <button
                key={ch.key}
                onClick={() => ch.connected !== false && onChannelChange(ch.key)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors",
                  selectedChannel === ch.key ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted",
                  ch.connected === false && "opacity-40 cursor-default"
                )}
              >
                <span>{ch.label}</span>
                {ch.connected === false ? (
                  <span className="text-[9px] text-muted-foreground">Conectar</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">{channelCounts(ch.key)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Etiquetas */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Etiquetas</p>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Buscar etiqueta..."
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              className="h-7 text-[11px] pl-7"
            />
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onTagsChange([])}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors",
                selectedTags.length === 0 ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
              )}
            >
              <span>Todas</span>
              <span className="text-[10px] text-muted-foreground">{conversations.length}</span>
            </button>
            {filteredTags.map((tag, i) => (
              <label
                key={tag}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors hover:bg-muted",
                  selectedTags.includes(tag) && "bg-primary/10"
                )}
              >
                <Checkbox
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                  className="w-3.5 h-3.5"
                />
                <span className={cn("w-2 h-2 rounded-full shrink-0", TAG_COLORS[i % TAG_COLORS.length])} />
                <span className="flex-1 truncate">{tag}</span>
                <span className="text-[10px] text-muted-foreground">{tagCounts(tag)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MensajesSidebar;
