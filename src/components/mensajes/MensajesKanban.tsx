import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import ConversationCard from "./ConversationCard";
import MensajesChat from "./MensajesChat";
import ContactInfoPanel from "./ContactInfoPanel";
import { getSeguimientoRemainingSeconds } from "./SeguimientoCountdown";
import type { PipelineConversation, PipelineTab } from "@/hooks/useConversationsByPipeline";

const KANBAN_COLUMNS: { tab: PipelineTab | string; label: string; color: string }[] = [
  { tab: "resueltos_ia", label: "Resueltos IA", color: "bg-violet-500" },
  { tab: "seguimiento_s1", label: "S1", color: "bg-blue-500" },
  { tab: "seguimiento_s2", label: "S2", color: "bg-blue-500" },
  { tab: "seguimiento_s3", label: "S3", color: "bg-blue-400" },
  { tab: "seguimiento_s4", label: "S4", color: "bg-blue-400" },
  { tab: "seguimiento_s5", label: "S5 ✋", color: "bg-amber-500" },
  { tab: "seguimiento_s6", label: "S6 ✋", color: "bg-amber-400" },
  { tab: "no_responden", label: "No responden", color: "bg-red-500" },
  { tab: "escalados", label: "Escalados", color: "bg-orange-500" },
  { tab: "agendados", label: "Agendados", color: "bg-emerald-500" },
  { tab: "no_show", label: "No-show", color: "bg-amber-500" },
  { tab: "show_sin_venta", label: "Show s/v", color: "bg-orange-400" },
  { tab: "pacientes", label: "Pacientes", color: "bg-teal-500" },
  { tab: "no_interesado", label: "No interesado", color: "bg-gray-500" },
  { tab: "perdidos", label: "Perdidos", color: "bg-pink-500" },
];

const SEGUIMIENTO_TABS = new Set(
  Array.from({ length: 10 }, (_, i) => `seguimiento_s${i + 1}`)
);

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

  // Pre-sort seguimiento columns by time remaining (closest first)
  const sortedConversations = useMemo(() => {
    const grouped = new Map<string, PipelineConversation[]>();
    for (const c of filteredConversations) {
      const tab = c.pipeline_tab || "resueltos_ia";
      if (!grouped.has(tab)) grouped.set(tab, []);
      grouped.get(tab)!.push(c);
    }
    // Sort seguimiento columns
    for (const [tab, items] of grouped) {
      if (SEGUIMIENTO_TABS.has(tab)) {
        items.sort((a, b) => {
          const aTime = getSeguimientoRemainingSeconds(a.seguimiento_next_contact_at, a.inactivity_timer_start, a.pipeline_tab);
          const bTime = getSeguimientoRemainingSeconds(b.seguimiento_next_contact_at, b.inactivity_timer_start, b.pipeline_tab);
          return aTime - bTime;
        });
      }
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
      <div
        className="grid h-full p-3 gap-2.5 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, minmax(160px, 1fr))` }}
      >
        {KANBAN_COLUMNS.map(col => {
          const items = sortedConversations.get(col.tab) || [];
          return (
            <div key={col.tab} className="flex flex-col min-w-0 rounded-lg border border-border bg-muted/30">
              <div className="p-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", col.color)} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                </div>
                <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{items.length}</Badge>
              </div>
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

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0">
          {selectedConv && (
            <div className="relative flex h-full">
              <div className="flex-1 min-w-0 overflow-hidden">
                <MensajesChat
                  conversation={selectedConv}
                  onActionComplete={onActionComplete}
                  showContactPanel={showContactPanel}
                  onToggleContactPanel={() => setShowContactPanel((prev) => !prev)}
                />
              </div>

              {showContactPanel && (
                <div className="absolute inset-y-0 right-0 z-20 hidden w-[320px] border-l border-border bg-card shadow-lg md:block">
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
