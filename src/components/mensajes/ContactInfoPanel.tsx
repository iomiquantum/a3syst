import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, Tag, FileText, ExternalLink, UserPlus, Calendar, Pencil, Check, X, Plus, Pin, Archive, Copy, PanelRightClose } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";

const PIPELINE_STAGES = [
  { key: "resueltos_ia", label: "Resueltos IA" },
  { key: "seguimiento_c1", label: "Seguimiento C1" },
  { key: "seguimiento_c2", label: "Seguimiento C2" },
  { key: "seguimiento_c3", label: "Seguimiento C3" },
  { key: "seguimiento_c4", label: "Seguimiento C4" },
  { key: "seguimiento_c5", label: "Seguimiento C5" },
  { key: "no_responden", label: "No responden" },
  { key: "no_interesado", label: "No interesado" },
  { key: "escalados", label: "Escalados" },
  { key: "agendados", label: "Agendados" },
  { key: "no_show", label: "No-show" },
  { key: "show_sin_venta", label: "Show sin venta" },
  { key: "pacientes", label: "Pacientes" },
  { key: "perdidos", label: "Perdidos" },
];

interface ContactData {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  location: string | null;
  funnel_stage: string;
  patient_id: string | null;
  tags: string[];
  notes: string | null;
  source: string | null;
  branch_id: string | null;
}

interface Props {
  conversation: PipelineConversation;
  onActionComplete?: () => void;
  onClose?: () => void;
}

type EditField = "name" | "phone" | "phone2" | "email" | "location" | "notes" | null;

const ContactInfoPanel = ({ conversation: c, onActionComplete }: Props) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [tagInput, setTagInput] = useState("");

  const fetchContact = async () => {
    if (!c.contact_id) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, phone2, email, location, funnel_stage, patient_id, tags, notes, source, branch_id")
      .eq("id", c.contact_id)
      .single();
    if (data) setContact(data as ContactData);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchContact();
  }, [c.contact_id]);

  if (loading || !contact) return null;

  const initials = contact.name?.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "??";

  const startEdit = (field: EditField, val: string) => {
    setEditField(field);
    setEditValue(val || "");
  };

  const cancelEdit = () => { setEditField(null); setEditValue(""); };

  const saveEdit = async (field: string) => {
    await supabase.from("contacts").update({ [field]: editValue.trim() || null }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, [field]: editValue.trim() || null } : prev);
    setEditField(null);
    setEditValue("");
    toast.success("Actualizado");
  };

  const updateStage = async (stage: string) => {
    // Update the pipeline_tab on the conversation, not the contact funnel_stage
    await (supabase as any).from("conversations").update({ pipeline_tab: stage }).eq("id", c.id);
    toast.success("Etapa actualizada");
    onActionComplete?.();
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    const newTags = [...(contact.tags || []), tagInput.trim()];
    await supabase.from("contacts").update({ tags: newTags }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, tags: newTags } : prev);
    setTagInput("");
  };

  const removeTag = async (tag: string) => {
    const newTags = (contact.tags || []).filter(t => t !== tag);
    await supabase.from("contacts").update({ tags: newTags }).eq("id", contact.id);
    setContact(prev => prev ? { ...prev, tags: newTags } : prev);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const openWhatsApp = () => {
    const num = contact.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  const EditableField = ({ field, label, value, icon: Icon, copyable }: { field: EditField; label: string; value: string | null; icon: any; copyable?: boolean }) => {
    const isEditing = editField === field;
    return (
      <div className="flex items-start gap-3 group">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
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
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => saveEdit(field!)}>
                <Check className="w-3 h-3 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={cancelEdit}>
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="text-sm text-foreground truncate">{value || <span className="text-muted-foreground italic text-xs">—</span>}</p>
              {copyable && value && (
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => copyText(value)}>
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <FileText className="w-3.5 h-3.5" /> Información de contacto
        </div>

        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center group">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <span className="text-base font-bold text-primary">{initials}</span>
          </div>
          {editField === "name" ? (
            <div className="flex items-center gap-1">
              <Input
                value={editValue} onChange={e => setEditValue(e.target.value)}
                className="h-7 text-sm text-center w-36" autoFocus
                onKeyDown={e => { if (e.key === "Enter") saveEdit("name"); if (e.key === "Escape") cancelEdit(); }}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit("name")}>
                <Check className="w-3 h-3 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-semibold text-foreground text-sm">{contact.name}</p>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => startEdit("name", contact.name)}>
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyText(contact.name)}>
                <Copy className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground mt-0.5">
            ● {PIPELINE_STAGES.find(s => s.key === c.pipeline_tab)?.label || c.pipeline_tab}
          </span>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <EditableField field="phone" label="Teléfono" value={contact.phone} icon={Phone} copyable />
          <EditableField field="email" label="Email" value={contact.email} icon={Mail} copyable />
          <EditableField field="location" label="Ubicación" value={contact.location} icon={MapPin} />

          {/* Pipeline Stage */}
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">✧ Etapa del pipeline</p>
            <Select value={c.pipeline_tab} onValueChange={updateStage}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient */}
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground mt-0.5 text-sm">⊕</span>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">ID Paciente</p>
              <p className="text-sm text-foreground">{contact.patient_id ? "Vinculado" : "No vinculado"}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-3">
            <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Etiquetas</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(contact.tags || []).map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Nueva etiqueta..." className="h-7 text-xs flex-1" onKeyDown={e => { if (e.key === "Enter") addTag(); }} />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={addTag}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3 group">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Notas</p>
              {editField === "notes" ? (
                <div className="mt-0.5 space-y-1">
                  <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm min-h-[60px]" autoFocus />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit("notes")}><Check className="w-3 h-3 text-emerald-500" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}><X className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes || <span className="text-muted-foreground italic text-xs">Añadir Notas</span>}</p>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => startEdit("notes", contact.notes || "")}>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <button onClick={openWhatsApp} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <ExternalLink className="w-4 h-4" /> Abrir en WhatsApp
          </button>
          <button onClick={() => toast.info("Conversión a paciente (próximamente)")} className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <UserPlus className="w-4 h-4" /> Convertir a Paciente
          </button>
          <button onClick={() => toast.info("Agendar cita (próximamente)")} className="w-full h-9 rounded-lg border border-border text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors">
            <Calendar className="w-4 h-4" /> Agendar
          </button>
          <button onClick={async () => {
            const newPinned = !c.pinned;
            await (supabase as any).from("conversations").update({ pinned: newPinned }).eq("id", c.id);
            toast.success(newPinned ? "Conversación fijada" : "Conversación desfijada");
            onActionComplete?.();
          }} className={cn("w-full h-8 rounded-lg border border-border text-xs font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors", c.pinned ? "text-primary bg-primary/10 border-primary/30" : "text-foreground")}>
            <Pin className="w-3.5 h-3.5" /> {c.pinned ? "Desfiar Conversación" : "Fijar Conversación"}
          </button>
          <button onClick={async () => {
            await supabase.from("conversations").update({ archived: true }).eq("id", c.id);
            toast.success("Conversación archivada");
            onActionComplete?.();
          }} className="w-full h-8 rounded-lg border border-border text-foreground text-xs font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors">
            <Archive className="w-3.5 h-3.5" /> Archivar Conversación
          </button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default ContactInfoPanel;
