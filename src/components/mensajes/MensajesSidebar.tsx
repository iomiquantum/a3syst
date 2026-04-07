import { useState } from "react";
import { Search, Archive, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";
import type { PipelineTab } from "@/hooks/useClinicPipelineTabs";

interface TagStat {
  tag: string;
  count: number;
}

interface Props {
  channelCounts: Record<string, number>;
  totalConversations: number;
  tagStats: TagStat[];
  selectedChannel: string;
  onChannelChange: (ch: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  showDeleted: boolean;
  onShowDeletedChange: (v: boolean) => void;
  isAdmin: boolean;
  // Embudo
  embudoTabs: PipelineTab[];
  activeEmbudoKey: string;
  onEmbudoChange: (key: string) => void;
}

const CHANNELS = [
  { key: "todos", label: "Todos" },
  { key: "whatsapp", label: "WhatsApp", connected: true },
  { key: "web", label: "Web", connected: true },
  { key: "instagram", label: "Instagram", connected: false },
  { key: "facebook", label: "Facebook", connected: false },
  { key: "tiktok", label: "TikTok", connected: false },
];

const STAGE_COLOR_MAP: Record<string, string> = {
  nuevos: "bg-gray-400",
  ads: "bg-blue-500",
  contacto_1: "bg-blue-500",
  contacto_2: "bg-blue-500",
  contacto_3: "bg-blue-500",
  no_responden: "bg-blue-500",
  no_interesado: "bg-blue-500",
  pidio_info: "bg-blue-500",
  interesada: "bg-blue-500",
  por_agendar: "bg-blue-500",
  agendado: "bg-emerald-500",
  paciente_1ra_visita: "bg-blue-500",
  paciente_tratamiento: "bg-blue-500",
  otras_ciudades: "bg-blue-500",
  error_sistema_inicial: "bg-blue-500",
  notas_de_voz: "bg-gray-400",
  new_lead: "bg-gray-400",
  citas_por_recordar: "bg-blue-500",
  test_audiencia: "bg-blue-500",
  informacion_otras_clinicas: "bg-blue-500",
  vitalscan_1: "bg-blue-500",
  vitalscan_2: "bg-blue-500",
  vitalscan_3: "bg-blue-500",
  no_asistio: "bg-blue-500",
};

const MensajesSidebar = ({
  channelCounts, totalConversations, tagStats,
  selectedChannel, onChannelChange,
  selectedTags, onTagsChange,
  showArchived, onShowArchivedChange,
  embudoTabs, activeEmbudoKey, onEmbudoChange,
}: Props) => {
  const [tagSearch, setTagSearch] = useState("");
  const [embudoExpanded, setEmbudoExpanded] = useState(true);

  const getChannelCount = (ch: string) => {
    if (ch === "todos") return totalConversations;
    return channelCounts[ch] || 0;
  };

  const filteredTags = tagSearch.trim()
    ? tagStats.filter(t => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : tagStats;

  const toggleTag = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const TAG_COLORS = ["bg-violet-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400", "bg-cyan-400", "bg-orange-400"];

  // Embudo stages (skip "todos" — it's handled by the "Todos" button at top)
  const embudoStages = embudoTabs.filter(t => t.key !== "todos");

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Todos */}
        <button
          onClick={() => onEmbudoChange("todos")}
          className={cn(
            "w-full text-left px-2.5 py-2 rounded-md text-sm flex items-center justify-between transition-colors font-medium",
            activeEmbudoKey === "todos" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
          )}
        >
          <span>Todos</span>
          <span className="text-xs text-muted-foreground">{totalConversations}</span>
        </button>

        <div className="border-t border-border" />

        {/* ETAPAS DEL EMBUDO */}
        <div>
          <button
            onClick={() => setEmbudoExpanded(!embudoExpanded)}
            className="w-full flex items-center justify-between px-1 mb-2"
          >
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Etapas del Embudo</p>
            {embudoExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </button>
          {embudoExpanded && (
            <div className="space-y-0.5">
              {embudoStages.map(stage => {
                const dotColor = STAGE_COLOR_MAP[stage.key] || "bg-blue-500";
                return (
                  <button
                    key={stage.key}
                    onClick={() => onEmbudoChange(stage.key)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors",
                      activeEmbudoKey === stage.key ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                      <span className="truncate">{stage.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{stage.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border" />

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
                  <span className="text-[10px] text-muted-foreground">{getChannelCount(ch.key)}</span>
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
              <span className="text-[10px] text-muted-foreground">{totalConversations}</span>
            </button>
            {filteredTags.map((ts, i) => (
              <label
                key={ts.tag}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors hover:bg-muted",
                  selectedTags.includes(ts.tag) && "bg-primary/10"
                )}
              >
                <Checkbox
                  checked={selectedTags.includes(ts.tag)}
                  onCheckedChange={() => toggleTag(ts.tag)}
                  className="w-3.5 h-3.5"
                />
                <span className={cn("w-2 h-2 rounded-full shrink-0", TAG_COLORS[i % TAG_COLORS.length])} />
                <span className="flex-1 truncate">{ts.tag}</span>
                <span className="text-[10px] text-muted-foreground">{ts.count}</span>
              </label>
            ))}
            {filteredTags.length === 0 && tagStats.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">Sin resultados</p>
            )}
            {tagStats.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">Sin etiquetas</p>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Archivadas */}
        <div>
          <label className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer">
            <Archive className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground flex-1">Archivadas</span>
            <Switch checked={showArchived} onCheckedChange={onShowArchivedChange} className="scale-75" />
          </label>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MensajesSidebar;
