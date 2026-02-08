import { Search, Plus, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CRMContact, FUNNEL_STAGES } from "@/hooks/useCRM";
import ChannelIcon from "@/components/messaging/ChannelIcon";

interface Props {
  contacts: CRMContact[];
  selected: CRMContact | null;
  stageFilter: string;
  searchQuery: string;
  onSelect: (c: CRMContact) => void;
  onFilterChange: (stage: string) => void;
  onSearchChange: (q: string) => void;
  onNewContact: () => void;
}

const ContactList = ({ contacts, selected, stageFilter, searchQuery, onSelect, onFilterChange, onSearchChange, onNewContact }: Props) => {
  const getStageInfo = (stage: string) => FUNNEL_STAGES.find(s => s.value === stage) || FUNNEL_STAGES[0];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4" /> Call Center
          </h2>
          <Button size="sm" onClick={onNewContact}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contactos..."
            className="pl-9 h-8 text-sm"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onFilterChange("todos")}
            className={cn("px-2 py-0.5 rounded-full text-xs font-medium transition-colors", stageFilter === "todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
          >
            Todos ({contacts.length})
          </button>
          {FUNNEL_STAGES.map(s => (
            <button
              key={s.value}
              onClick={() => onFilterChange(s.value)}
              className={cn("px-2 py-0.5 rounded-full text-xs font-medium transition-colors", stageFilter === s.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {contacts.map(contact => {
            const stage = getStageInfo(contact.funnel_stage);
            return (
              <button
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={cn("w-full text-left p-3 hover:bg-muted/50 transition-colors", selected?.id === contact.id && "bg-muted")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      {contact.source && <ChannelIcon channel={contact.source} size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-1", stage.color)} />
                      {stage.label}
                    </Badge>
                    {contact.patient_id && (
                      <Badge className="text-[10px] px-1.5 bg-green-100 text-green-700 border-green-200">Paciente</Badge>
                    )}
                  </div>
                </div>
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {contact.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
          {contacts.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No se encontraron contactos
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContactList;
