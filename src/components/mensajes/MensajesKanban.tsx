import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import ConversationCard from "./ConversationCard";
import MensajesChat from "./MensajesChat";
import ContactInfoPanel from "./ContactInfoPanel";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";

const KANBAN_COLUMNS = EMBUDO_STAGES
  .filter(s => s.key !== "todos")
  .map(s => ({
    tab: s.key,
    label: s.label,
    color: s.key === "agendado" ? "bg-emerald-500" : s.key === "nuevos" || s.key === "notas_de_voz" || s.key === "new_lead" ? "bg-gray-400" : "bg-blue-500",
    tooltip: s.label,
  }));

interface Props {
  conversations: PipelineConversation[];
  onActionComplete?: () => void;
}

const MensajesKanban = ({ conversations, onActionComplete }: Props) => {
  const [selectedConv, setSelectedConv] = useState<PipelineConversation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelect = (c: PipelineConversation) => {
    setSelectedConv(c);
    setShowContactPanel(false);
    setSheetOpen(true);
  };

  const handleSheetChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setShowContactPanel(false);
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.contactName.toLowerCase().includes(q) ||
      c.contactPhone.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const sortedConversations = useMemo(() => {
    const grouped = new Map<string, PipelineConversation[]>();
    for (const c of filteredConversations) {
      const tab = c.pipeline_tab || "nuevos";
      if (!grouped.has(tab)) grouped.set(tab, []);
      grouped.get(tab)!.push(c);
    }
    return grouped;
  }, [filteredConversations]);

  return (
    <>
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
      </div>
      <TooltipProvider delayDuration={300}>
        <div
          className="grid h-full p-3 gap-2.5 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, minmax(160px, 1fr))` }}
        >
          {KANBAN_COLUMNS.map(col => {
            const items = sortedConversations.get(col.tab) || [];
            return (
              <div key={col.tab} className="flex flex-col min-w-0 rounded-lg border border-border bg-muted/30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2.5 border-b border-border flex items-center justify-between cursor-help">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", col.color)} />
                        <span className="text-xs font-semibold text-foreground">{col.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{items.length}</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                    {col.tooltip}
                  </TooltipContent>
                </Tooltip>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {items.map(c => (
                      <ConversationCard key={c.id} conversation={c} onClick={() => handleSelect(c)} variant="kanban" />
                    ))}
                    {items.length === 0 && (
                      <p className="text-center text-[10px] text-muted-foreground py-4">Sin conversaciones</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </TooltipProvider>

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0">
          {selectedConv && (
            <div className="flex h-full">
              <div className="flex-1 min-w-0 overflow-hidden">
                <MensajesChat
                  conversation={selectedConv}
                  onActionComplete={onActionComplete}
                  showContactPanel={showContactPanel}
                  onToggleContactPanel={() => setShowContactPanel((prev) => !prev)}
                />
              </div>

              {showContactPanel && (
                <div className="w-[320px] shrink-0 border-l border-border bg-card hidden md:block overflow-y-auto">
                  <ContactInfoPanel
                    conversation={selectedConv}
                    onActionComplete={onActionComplete}
                    onClose={() => setShowContactPanel(false)}
                  />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MensajesKanban;
