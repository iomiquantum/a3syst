import { Phone, Mail, MapPin, Tag, FileText, ExternalLink, UserPlus, Calendar, Bot } from "lucide-react";
import { Conversation, FUNNEL_STAGES } from "@/hooks/useMessaging";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface Props {
  conversation: Conversation;
  onUpdateStage: (contactId: string, stage: string) => void;
  onToggleChatbot?: (conversationId: string, active: boolean) => void;
}

const ContactPanel = ({ conversation, onUpdateStage, onToggleChatbot }: Props) => {
  const contact = conversation.contact;
  if (!contact) return null;

  const initials = contact.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-1 text-sm text-primary font-medium">
          <FileText className="w-4 h-4" /> Información de contacto
        </div>

        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-2">
            <span className="text-lg font-bold text-primary-foreground">{initials}</span>
          </div>
          <p className="font-semibold text-foreground">{contact.name}</p>
          <span className="text-xs text-muted-foreground">{FUNNEL_STAGES.find(s => s.key === contact.funnel_stage)?.label || contact.funnel_stage}</span>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="text-sm text-foreground">{contact.phone}</p>
            </div>
          </div>

          {contact.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{contact.email}</p>
              </div>
            </div>
          )}

          {contact.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="text-sm text-foreground">{contact.location}</p>
              </div>
            </div>
          )}

          {/* Funnel Stage */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">✧ Etapa del embudo</p>
            <Select value={contact.funnel_stage} onValueChange={v => onUpdateStage(contact.id, v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNNEL_STAGES.filter(s => s.key !== "todos").map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient link */}
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground mt-0.5 text-sm">⊕</span>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">ID Paciente</p>
              <p className="text-sm text-foreground">{contact.patient_id ? "Vinculado" : "No vinculado"}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-3">
            <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Etiquetas</p>
              {contact.tags && contact.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.tags.map(t => (
                    <span key={t} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Añadir etiqueta</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm text-foreground">{contact.notes || <span className="text-muted-foreground italic text-xs">Añadir Notas</span>}</p>
            </div>
          </div>
        </div>

        {/* Chatbot Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Chatbot IA</p>
              <p className="text-[11px] text-muted-foreground">Responde automáticamente</p>
            </div>
          </div>
          <Switch
            checked={conversation.chatbot_active}
            onCheckedChange={(checked) => onToggleChatbot?.(conversation.id, checked)}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button className="w-full h-9 rounded-lg bg-success text-success-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <ExternalLink className="w-4 h-4" /> Abrir en WhatsApp
          </button>
          <button className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <UserPlus className="w-4 h-4" /> Convertir a Paciente
          </button>
          <button className="w-full h-9 rounded-lg border border-border text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors">
            <Calendar className="w-4 h-4" /> Agendar
          </button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default ContactPanel;
