import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, FileText, ExternalLink, UserPlus, Calendar, Pencil, Check, X, Plus, Pin, Archive, Copy, PhoneCall, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";
import ManualBookingDialog from "@/components/mensajes/ManualBookingDialog";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";

const PIPELINE_STAGES = EMBUDO_STAGES.filter(s => s.key !== "todos").map(s => ({
  key: s.key,
  label: s.label,
}));

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

interface PatientSummary {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: string | null;
}

interface AppointmentSummary {
  id: string;
  date: string;
  time: string | null;
  status: string | null;
  notes: string | null;
  treatment_name: string | null;
  professional_name: string | null;
  branch_name: string | null;
}

interface Props {
  conversation: PipelineConversation;
  onActionComplete?: () => void;
  onClose?: () => void;
}

type EditField = "name" | "phone" | "phone2" | "email" | "location" | "notes" | "alternative_phone" | "alternative_phone_label" | null;

const ContactInfoPanel = ({ conversation: c, onActionComplete, onClose }: Props) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [latestAppointment, setLatestAppointment] = useState<AppointmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!c.contact_id) {
      setContact(null);
      setPatient(null);
      setLatestAppointment(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, phone2, email, alternative_phone, alternative_phone_label, location, funnel_stage, patient_id, tags, notes, source, branch_id")
      .eq("id", c.contact_id)
      .single();

    if (!data) {
      setContact(null);
      setPatient(null);
      setLatestAppointment(null);
      setLoading(false);
      return;
    }

    const nextContact: ContactData = {
      ...(data as ContactData),
      tags: (data as ContactData).tags || [],
    };

    if (nextContact.patient_id) {
      const [{ data: patientData }, { data: appointmentData }] = await Promise.all([
        (supabase as any)
          .from("patients")
          .select("id, first_name, last_name, phone, email, status")
          .eq("id", nextContact.patient_id)
          .maybeSingle(),
        (supabase as any)
          .from("appointments")
          .select("id, date, time, status, notes, treatments(name), professionals(full_name), branches(name)")
          .eq("patient_id", nextContact.patient_id)
          .order("date", { ascending: false })
          .order("time", { ascending: false })
          .limit(1),
      ]);

      setPatient((patientData as PatientSummary | null) || null);

      const appointment = appointmentData?.[0];
      setLatestAppointment(
        appointment
          ? {
              id: appointment.id,
              date: appointment.date,
              time: appointment.time || null,
              status: appointment.status || null,
              notes: appointment.notes || null,
              treatment_name: appointment.treatments?.name || null,
              professional_name: appointment.professionals?.full_name || null,
              branch_name: appointment.branches?.name || null,
            }
          : null,
      );
    } else {
      setPatient(null);
      setLatestAppointment(null);
    }

    if (data) {
      setContact(prev => {
        if (prev) {
          const changedFields: string[] = [];
          if (prev.email !== nextContact.email && nextContact.email) changedFields.push("email");
          if (prev.alternative_phone !== nextContact.alternative_phone && nextContact.alternative_phone) changedFields.push("alternative_phone");
          if (prev.notes !== nextContact.notes && nextContact.notes) changedFields.push("notes");
          if (changedFields.length > 0) {
            setHighlightedField(changedFields[0]);
            setTimeout(() => setHighlightedField(null), 2500);
          }
        }
        return nextContact;
      });
    }
    setLoading(false);
  }, [c.contact_id]);

  useEffect(() => {
    setLoading(true);
    fetchContact();
  }, [c.contact_id, fetchContact]);

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
  const patientName = patient ? [patient.first_name, patient.last_name].filter(Boolean).join(" ") : null;
  const appointmentDetails: AppointmentSummary | null = latestAppointment || (c.appointment_date
    ? {
        id: `conversation-${c.id}`,
        date: c.appointment_date,
        time: c.appointment_time,
        status: c.appointment_status,
        notes: null,
        treatment_name: c.appointment_service,
        professional_name: null,
        branch_name: null,
      }
    : null);

  const formatAppointmentDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  const formatStatus = (value: string | null | undefined) => {
    if (!value) return "pendiente";
    return value.replace(/_/g, " ");
  };

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
                className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
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

  const handlePinToggle = async () => {
    await (supabase as any).from("conversations").update({ pinned: !c.pinned }).eq("id", c.id);
    toast.success(c.pinned ? "Desanclada" : "Conversación anclada");
    onActionComplete?.();
  };

  const handleArchiveToggle = async () => {
    const newArchived = !(c as any).archived;
    await (supabase as any).from("conversations").update({ archived: newArchived }).eq("id", c.id);
    toast.success(newArchived ? "Conversación archivada" : "Conversación desarchivada");
    onActionComplete?.();
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Close button */}
        {onClose && (
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ficha de contacto</p>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">{initials}</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{contact.name}</p>
            {contact.source && (
              <p className="text-[10px] text-muted-foreground">Fuente: {contact.source}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePinToggle}>
              <Pin className={cn("w-3 h-3", c.pinned && "text-primary fill-primary")} />
              {c.pinned ? "Desanclar" : "Anclar"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleArchiveToggle}>
              <Archive className="w-3 h-3" />
              Archivar
            </Button>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Pipeline Stage (Manual Embudo) */}
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Etapa del embudo</p>
          <Select value={c.pipeline_tab || "nuevos"} onValueChange={updateStage}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border" />

        {/* Contact Info */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Información</p>
          <EditableField field="name" label="Nombre" value={contact.name} icon={UserPlus} />
          <EditableField field="phone" label="Teléfono" value={contact.phone} icon={Phone} copyable />
          <EditableField field="phone2" label="Teléfono 2" value={contact.phone2} icon={Phone} copyable placeholder="Agregar" />
          <EditableField field="alternative_phone" label="Tel. alternativo" value={contact.alternative_phone} icon={Phone} copyable placeholder="Agregar" isHighlighted={highlightedField === "alternative_phone"} />
          <EditableField field="email" label="Email" value={contact.email} icon={Mail} copyable placeholder="Agregar" isHighlighted={highlightedField === "email"} />
          <EditableField field="location" label="Ubicación" value={contact.location} icon={MapPin} placeholder="Agregar" />

          {/* WhatsApp button */}
          {contact.phone && (
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 mt-1" onClick={openWhatsApp}>
              <ExternalLink className="w-3 h-3" /> Abrir en WhatsApp
            </Button>
          )}

          {/* Phone call button */}
          {contact.phone && (
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" onClick={() => window.open(`tel:${contact.phone}`, "_self")}>
              <PhoneCall className="w-3 h-3" /> Llamar
            </Button>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Tags */}
        {(contact.patient_id || appointmentDetails) && (
          <>
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Paciente y cita</p>

              {contact.patient_id && (
                <Card className="shadow-none">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <UserPlus className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">Paciente vinculado</p>
                        <p className="text-sm font-medium text-foreground truncate">{patientName || contact.name}</p>
                        {(patient?.phone || patient?.email) && (
                          <p className="text-xs text-muted-foreground break-all">
                            {[patient?.phone, patient?.email].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                        {patient?.status ? formatStatus(patient.status) : "vinculado"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {appointmentDetails && (
                <Card className="shadow-none">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">Última cita registrada</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatAppointmentDate(appointmentDetails.date)}
                          {appointmentDetails.time ? ` · ${appointmentDetails.time}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {formatStatus(appointmentDetails.status)}
                      </Badge>
                    </div>

                    {appointmentDetails.treatment_name && (
                      <div className="text-xs text-muted-foreground">
                        Tratamiento: <span className="text-foreground">{appointmentDetails.treatment_name}</span>
                      </div>
                    )}

                    {appointmentDetails.professional_name && (
                      <div className="text-xs text-muted-foreground">
                        Profesional: <span className="text-foreground">{appointmentDetails.professional_name}</span>
                      </div>
                    )}

                    {appointmentDetails.branch_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="text-foreground">{appointmentDetails.branch_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="border-t border-border" />
          </>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Etiquetas</p>
          <div className="flex flex-wrap gap-1">
            {(contact.tags || []).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              placeholder="Nueva etiqueta..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className="h-7 text-xs flex-1"
              onKeyDown={e => { if (e.key === "Enter") addTag(); }}
            />
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={addTag}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Notes */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Notas</p>
          <EditableField field="notes" label="" value={contact.notes} icon={FileText} placeholder="Agregar notas..." isHighlighted={highlightedField === "notes"} />
        </div>

        {/* Booking */}
        <div className="border-t border-border pt-2">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => setBookingOpen(true)}>
            <Calendar className="w-3.5 h-3.5" /> Agendar cita
          </Button>
        </div>

        <ManualBookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          contactId={c.contact_id}
          contactName={c.contactName}
          contactPhone={c.contactPhone}
          contactEmail={c.contactEmail}
          conversationId={c.id}
          onBooked={() => {
            setBookingOpen(false);
            onActionComplete?.();
          }}
        />
      </div>
    </ScrollArea>
  );
};

export default ContactInfoPanel;
