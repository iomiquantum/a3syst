import { useState } from "react";
import { Phone, Mail, MapPin, Tag, FileText, ExternalLink, UserPlus, Calendar, Bot, Pencil, Check, X, Plus } from "lucide-react";
import { Conversation, Contact, FUNNEL_STAGES } from "@/hooks/useMessaging";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  conversation: Conversation;
  onUpdateStage: (contactId: string, stage: string) => void;
  onUpdateContact: (contactId: string, updates: Partial<Contact>) => void;
  onToggleChatbot?: (conversationId: string, active: boolean) => void;
}

type EditingField = "name" | "phone" | "phone2" | "email" | "notes" | "tags" | null;

const ContactPanel = ({ conversation, onUpdateStage, onUpdateContact, onToggleChatbot }: Props) => {
  const contact = conversation.contact;
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState("");
  const [tagInput, setTagInput] = useState("");

  if (!contact) return null;

  const initials = contact.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  const startEdit = (field: EditingField, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = (field: string) => {
    onUpdateContact(contact.id, { [field]: editValue.trim() || null });
    setEditingField(null);
    setEditValue("");
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...(contact.tags || []), tagInput.trim()];
    onUpdateContact(contact.id, { tags: newTags });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const newTags = (contact.tags || []).filter(t => t !== tag);
    onUpdateContact(contact.id, { tags: newTags });
  };

  const EditableField = ({ field, label, value, icon: Icon }: { field: EditingField; label: string; value: string | null; icon: any }) => {
    const isEditing = editingField === field;
    return (
      <div className="flex items-start gap-3 group">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isEditing ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit(field!);
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveEdit(field!)}>
                <Check className="w-3.5 h-3.5 text-success" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
                <X className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="text-sm text-foreground truncate">{value || <span className="text-muted-foreground italic text-xs">Sin datos</span>}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => startEdit(field, value || "")}
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-1 text-sm text-primary font-medium">
          <FileText className="w-4 h-4" /> Información de contacto
        </div>

        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center group">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-2">
            <span className="text-lg font-bold text-primary-foreground">{initials}</span>
          </div>
          {editingField === "name" ? (
            <div className="flex items-center gap-1">
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="h-7 text-sm text-center w-40"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit("name");
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit("name")}>
                <Check className="w-3.5 h-3.5 text-success" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                <X className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-semibold text-foreground">{contact.name}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEdit("name", contact.name)}
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          )}
          <span className="text-xs text-muted-foreground">{FUNNEL_STAGES.find(s => s.key === contact.funnel_stage)?.label || contact.funnel_stage}</span>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <EditableField field="phone" label="Teléfono" value={contact.phone} icon={Phone} />
          <EditableField field="phone2" label="Teléfono 2" value={contact.phone2} icon={Phone} />
          <EditableField field="email" label="Email" value={contact.email} icon={Mail} />

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

          {/* Tags - editable */}
          <div className="flex items-start gap-3">
            <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Etiquetas</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(contact.tags || []).map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-destructive">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="Nueva etiqueta..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={e => { if (e.key === "Enter") addTag(); }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={addTag}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notes - editable */}
          <div className="flex items-start gap-3 group">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Notas</p>
              {editingField === "notes" ? (
                <div className="mt-0.5 space-y-1">
                  <Textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="text-sm min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit("notes")}>
                      <Check className="w-3.5 h-3.5 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes || <span className="text-muted-foreground italic text-xs">Añadir Notas</span>}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => startEdit("notes", contact.notes || "")}
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              )}
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
