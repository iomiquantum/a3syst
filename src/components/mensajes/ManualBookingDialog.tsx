import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";
import { Calendar, User, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  conversationId: string;
  onBooked?: () => void;
}

const ManualBookingDialog = ({
  open, onOpenChange, contactId, contactName, contactPhone, contactEmail,
  conversationId, onBooked,
}: Props) => {
  const { clinicId } = useClinic();
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    service_id: "",
    professional_id: "",
    branch_id: "",
    date: "",
    time: "",
    duration: "30",
    notes: "",
  });

  useEffect(() => {
    if (!clinicId || !open) return;
    Promise.all([
      supabase.from("treatments").select("id, name, duration, price").eq("clinic_id", clinicId),
      supabase.from("professionals").select("id, full_name").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("branches").select("id, name").eq("clinic_id", clinicId).eq("active", true),
    ]).then(([t, p, b]) => {
      setServices(t.data || []);
      setProfessionals(p.data || []);
      setBranches(b.data || []);
    });
  }, [clinicId, open]);

  const handleServiceChange = (id: string) => {
    const svc = services.find(s => s.id === id);
    setForm(f => ({ ...f, service_id: id, duration: svc?.duration ? String(svc.duration) : f.duration }));
  };

  const handleSubmit = async () => {
    if (!clinicId || !form.date || !form.time) return;
    setSaving(true);

    try {
      // 1. Find or create a patient from the contact
      let patientId: string | null = null;

      // Check if contact already has a patient_id
      const { data: contact } = await supabase
        .from("contacts")
        .select("patient_id")
        .eq("id", contactId)
        .single();

      if (contact?.patient_id) {
        patientId = contact.patient_id;
      } else {
        // Create patient from contact data
        const nameParts = contactName.split(" ");
        const firstName = nameParts[0] || contactName;
        const lastName = nameParts.slice(1).join(" ") || "";

        const { data: newPatient, error: patErr } = await supabase
          .from("patients")
          .insert({
            clinic_id: clinicId,
            first_name: firstName,
            last_name: lastName,
            phone: contactPhone,
            email: contactEmail || null,
          })
          .select("id")
          .single();

        if (patErr) throw patErr;
        patientId = newPatient.id;

        // Link patient to contact
        await supabase.from("contacts").update({ patient_id: patientId }).eq("id", contactId);
      }

      // 2. Create the appointment
      const { error: aptErr } = await (supabase as any).from("appointments").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        treatment_id: form.service_id || null,
        professional_id: form.professional_id || null,
        branch_id: form.branch_id || null,
        date: form.date,
        time: form.time,
        duration: parseInt(form.duration) || 30,
        notes: form.notes || `Agendado manualmente desde chat — ${contactName}`,
        status: "pendiente",
        booking_source: "manual",
      });

      if (aptErr) throw aptErr;

      // 3. Update conversation to "agendados" pipeline
      const svcName = services.find(s => s.id === form.service_id)?.name || null;
      await (supabase as any).from("conversations").update({
        pipeline_tab: "agendados",
        appointment_date: form.date,
        appointment_time: form.time,
        appointment_service: svcName,
        appointment_status: "pendiente",
        appointment_confirmed: false,
        appointment_branch_id: form.branch_id || null,
      }).eq("id", conversationId);

      // 4. Log in pipeline history
      await (supabase as any).from("conversation_pipeline_history").insert({
        conversation_id: conversationId,
        clinic_id: clinicId,
        from_tab: "escalados",
        to_tab: "agendados",
        moved_by: "human",
        reason: "Cita agendada manualmente por operador",
      });

      toast.success("✅ Cita agendada correctamente");
      onOpenChange(false);
      setForm({ service_id: "", professional_id: "", branch_id: "", date: "", time: "", duration: "30", notes: "" });
      onBooked?.();
    } catch (e: any) {
      toast.error(e.message || "Error al agendar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Agendar cita manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Contact info (read-only) */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground">{contactPhone}</p>
            </div>
          </div>

          {/* Service */}
          <div>
            <Label className="text-xs text-muted-foreground">Servicio</Label>
            <Select value={form.service_id} onValueChange={handleServiceChange}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.price ? `· $${s.price}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Professional */}
          {professionals.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Profesional</Label>
              <Select value={form.professional_id} onValueChange={v => setForm(f => ({ ...f, professional_id: v }))}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1">
                  <SelectValue placeholder="Seleccionar profesional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Branch */}
          {branches.length > 1 && (
            <div>
              <Label className="text-xs text-muted-foreground">Sucursal</Label>
              <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date / Time / Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Fecha *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hora *</Label>
              <Input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Duración (min)</Label>
              <Input
                type="number"
                value={form.duration}
                min={5}
                max={480}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              className="bg-white/5 border-white/10 text-foreground mt-1 min-h-[60px]"
              maxLength={1000}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.date || !form.time}
              className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90"
            >
              {saving ? "Agendando..." : "Agendar cita"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBookingDialog;
