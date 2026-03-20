import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, Tag, FileText, ExternalLink, UserPlus, Calendar, Pencil, Check, X, Plus, Pin, Archive, Copy, PhoneCall } from "lucide-react";
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
  { key: "seguimiento_s1", label: "Seguimiento S1" },
  { key: "seguimiento_s2", label: "Seguimiento S2" },
  { key: "seguimiento_s3", label: "Seguimiento S3" },
  { key: "seguimiento_s4", label: "Seguimiento S4" },
  { key: "seguimiento_s5", label: "Seguimiento S5" },
  { key: "seguimiento_s6", label: "Seguimiento S6" },
  { key: "seguimiento_s7", label: "Seguimiento S7" },
  { key: "seguimiento_s8", label: "Seguimiento S8" },
  { key: "seguimiento_s9", label: "Seguimiento S9" },
  { key: "seguimiento_s10", label: "Seguimiento S10" },
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
  alternative_phone: string | null;
  alternative_phone_label: string | null;
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

type EditField = "name" | "phone" | "phone2" | "email" | "location" | "notes" | "alternative_phone" | "alternative_phone_label" | null;

const ContactInfoPanel = ({ conversation: c, onActionComplete, onClose }: Props) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!c.contact_id) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, phone2, email, alternative_phone, alternative_phone_label, location, funnel_stage, patient_id, tags, notes, source, branch_id")
      .eq("id", c.contact_id)
      .single();
    if (data) {
      setContact(prev => {
        if (prev) {
          // Detect which fields changed for highlight
          const changedFields: string[] = [];
          if (prev.email !== (data as any).email && (data as any).email) changedFields.push("email");
          if (prev.alternative_phone !== (data as any).alternative_phone && (data as any).alternative_phone) changedFields.push("alternative_phone");
          if (prev.notes !== (data as any).notes && (data as any).notes) changedFields.push("notes");
          if (changedFields.length > 0) {
            setHighlightedField(changedFields[0]);
            setTimeout(() => setHighlightedField(null), 2500);
          }
        }
        return data as ContactData;
      });
    }
    setLoading(false);
  }, [c.contact_id]);

  useEffect(() => {
    setLoading(true);
    fetchContact();
  }, [c.contact_id, fetchContact]);

  // Realtime subscription for contact updates
  useEffect(() => {
    if (!c.contact_id) return;
    const channel = supabase
      .channel(`contact-${c.contact_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contacts", filter: `id=eq.${c.contact_id}` },
        () => { fetchContact(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [c.contact_id, fetchContact]);

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
    toast.success("Información actualizada");
  };

  const updateStage = async (stage: string) => {
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

  const EditableField = ({ field, label, value, icon: Icon, copyable, placeholder, isHighlighted }: { field: EditField; label: string; value: string | null; icon: any; copyable?: boolean; placeholder?: string; isHighlighted?: boolean }) => {
    const isEditing = editField === field;
    return (
      <div className={cn(
        "flex items-start gap-3 group rounded-md px-1 py-0.5 transition-colors duration-500",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/30"
      )}>
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
              <p className="text-sm text-foreground truncate">
                {value || <span className="text-muted-foreground italic text-xs">{placeholder || "—"}</span>}
              </p>
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

  const altPhoneDisplay = contact.alternative_phone
    ? contact.alternative_phone_label
      ? `${contact.alternative_phone} (${contact.alternative_phone_label})`
      : contact.alternative_phone
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <FileText className="w-3.5 h-3.5" /> Información de contacto
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
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
          <EditableField field="phone" label="📱 WhatsApp" value={contact.phone} icon={Phone} copyable />
          <EditableField
            field="alternative_phone"
            label="📞 Teléfono alternativo"
            value={altPhoneDisplay}
            icon={PhoneCall}
            copyable
            placeholder="Sin teléfono alternativo"
            isHighlighted={highlightedField === "alternative_phone"}
          />
          <EditableField
            field="email"
            label="📧 Email"
            value={contact.email}
            icon={Mail}
            copyable
            placeholder="Sin correo"
            isHighlighted={highlightedField === "email"}
          />
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
          <div className={cn(
            "flex items-start gap-3 group rounded-md px-1 py-0.5 transition-colors duration-500",
            highlightedField === "notes" && "bg-yellow-100 dark:bg-yellow-900/30"
          )}>
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">📝 Notas</p>
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
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes || <span className="text-muted-foreground italic text-xs">Sin notas</span>}</p>
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
            <Pin className="w-3.5 h-3.5" /> {c.pinned ? "Desfijar Conversación" : "Fijar Conversación"}
          </button>
          <button onClick={async () => {
            await supabase.from("conversations").update({ archived: true }).eq("id", c.id);
            toast.success("Conversación archivada");
            onActionComplete?.();
          }} className="w-full h-8 rounded-lg border border-border text-xs font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors text-muted-foreground">
            <Archive className="w-3.5 h-3.5" /> Archivar Conversación
          </button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default ContactInfoPanel;
