import { useState, DragEvent } from "react";
import { Phone, Mail, GripVertical, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CRMContact, FUNNEL_STAGES } from "@/hooks/useCRM";
import ChannelIcon from "@/components/messaging/ChannelIcon";

interface Props {
  contacts: CRMContact[];
  selected: CRMContact | null;
  onSelect: (c: CRMContact) => void;
  onMoveStage: (contactId: string, newStage: string) => void;
}

const KanbanBoard = ({ contacts, selected, onSelect, onMoveStage }: Props) => {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const contactsByStage = FUNNEL_STAGES.reduce<Record<string, CRMContact[]>>((acc, stage) => {
    acc[stage.value] = contacts.filter(c => c.funnel_stage === stage.value);
    return acc;
  }, {});

  const handleDragStart = (e: DragEvent, contactId: string) => {
    e.dataTransfer.setData("contactId", contactId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(contactId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: DragEvent, stage: string) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData("contactId");
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact && contact.funnel_stage !== stage) {
        onMoveStage(contactId, stage);
      }
    }
    setDragOverStage(null);
    setDraggingId(null);
  };

  const columnCount = FUNNEL_STAGES.length;

  return (
    <div className="grid h-full p-4 gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(200px, 1fr))` }}>
      {FUNNEL_STAGES.map(stage => {
        const stageContacts = contactsByStage[stage.value] || [];
        const isDragOver = dragOverStage === stage.value;

        return (
          <div
            key={stage.value}
            className={cn(
              "flex flex-col min-w-0 rounded-lg border border-border bg-muted/30 transition-colors",
              isDragOver && "border-primary bg-primary/5"
            )}
            onDragOver={e => handleDragOver(e, stage.value)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage.value)}
          >
            {/* Column header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full", stage.color)} />
                <span className="text-sm font-semibold text-foreground">{stage.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                {stageContacts.length}
              </Badge>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {stageContacts.map(contact => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={e => handleDragStart(e, contact.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelect(contact)}
                    className={cn(
                      "rounded-md border bg-card p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                      selected?.id === contact.id && "ring-2 ring-primary border-primary",
                      draggingId === contact.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {contact.name}
                      </p>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1 flex-wrap">
                        {(contact.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        {contact.source && <ChannelIcon channel={contact.source} size="sm" />}
                        {contact.patient_id && <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                      </div>
                    </div>
                  </div>
                ))}

                {stageContacts.length === 0 && (
                  <div className={cn(
                    "rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors",
                    isDragOver && "border-primary text-primary"
                  )}>
                    {isDragOver ? "Soltar aquí" : "Sin contactos"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
