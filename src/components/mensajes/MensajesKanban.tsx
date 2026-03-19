import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ConversationCard from "./ConversationCard";
import MensajesChat from "./MensajesChat";
import ContactInfoPanel from "./ContactInfoPanel";
import type { PipelineConversation, PipelineTab } from "@/hooks/useConversationsByPipeline";

const KANBAN_COLUMNS: { tab: PipelineTab; label: string; color: string }[] = [
  { tab: "resueltos_ia", label: "Resueltos IA", color: "bg-violet-500" },
  { tab: "seguimiento_c1", label: "C1", color: "bg-blue-500" },
  { tab: "seguimiento_c2", label: "C2", color: "bg-blue-400" },
  { tab: "seguimiento_c3", label: "C3", color: "bg-blue-300" },
  { tab: "no_responden", label: "No responden", color: "bg-red-500" },
  { tab: "escalados", label: "Escalados", color: "bg-orange-500" },
  { tab: "clientes", label: "Clientes", color: "bg-emerald-500" },
];

interface Props {
  conversations: PipelineConversation[];
  onActionComplete?: () => void;
}

const MensajesKanban = ({ conversations, onActionComplete }: Props) => {
  const [selectedConv, setSelectedConv] = useState<PipelineConversation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelect = (c: PipelineConversation) => {
    setSelectedConv(c);
    setSheetOpen(true);
  };

  return (
    <>
      <div
        className="grid h-full p-3 gap-2.5 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, minmax(180px, 1fr))` }}
      >
        {KANBAN_COLUMNS.map(col => {
          const items = conversations.filter(c => c.pipeline_tab === col.tab);
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0">
          {selectedConv && <MensajesChat conversation={selectedConv} onActionComplete={onActionComplete} />}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MensajesKanban;
