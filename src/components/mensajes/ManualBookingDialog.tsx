import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";
import { Calendar, User, Clock, AlertCircle } from "lucide-react";

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

interface WorkingScheduleDay {
  enabled: boolean;
  open: string;
  close: string;
  last_appointment?: string;
}

type WorkingSchedule = Record<string, WorkingScheduleDay>;

const DAY_KEY_BY_INDEX: Record<number, string> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles",
  4: "jueves", 5: "viernes", 6: "sabado",
};

function generateTimeSlots(open: string, lastAppointment: string | undefined, close: string): string[] {
  const end = lastAppointment || close;
  const [startH, startM] = open.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const slots: string[] = [];
  let h = startH, m = startM;
  while (h < endH || (h === endH && m <= endM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

const ManualBookingDialog = ({
  open, onOpenChange, contactId, contactName, contactPhone, contactEmail,
  conversationId, onBooked,
}: Props) => {
  const { clinicId } = useClinic();
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [blockedDays, setBlockedDays] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    service_id: "",
    professional_id: "por_definir",
    branch_id: "",
    date: "",
    time: "",
    duration: "30",
    notes: "",
  });

  // Load base data
  useEffect(() => {
    if (!clinicId || !open) return;
    Promise.all([
      supabase.from("treatments").select("id, name, duration, price").eq("clinic_id", clinicId),
      supabase.from("professionals").select("id, full_name").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("branches").select("id, name, working_schedule").eq("clinic_id", clinicId).eq("active", true),
      (supabase as any).from("blocked_days").select("date, reason, branch_id").eq("clinic_id", clinicId),
    ]).then(([t, p, b, bd]) => {
      setServices(t.data || []);
      setProfessionals(p.data || []);
      const branchData = b.data || [];
      setBranches(branchData);
      setBlockedDays(bd.data || []);
      // Auto-select if only one branch
      if (branchData.length === 1) {
        setForm(f => ({ ...f, branch_id: branchData[0].id }));
      }
    });
  }, [clinicId, open]);

  // Load existing appointments when date changes
  useEffect(() => {
    if (!clinicId || !form.date || !form.branch_id) {
      setExistingAppointments([]);
      return;
    }
    (supabase as any)
      .from("appointments")
      .select("time, duration")
      .eq("clinic_id", clinicId)
      .eq("date", form.date)
      .eq("branch_id", form.branch_id)
      .not("status", "eq", "cancelled")
      .then(({ data }: any) => setExistingAppointments(data || []));
  }, [clinicId, form.date, form.branch_id]);

  // Check if selected date is blocked
  const isDateBlocked = useMemo(() => {
    if (!form.date) return false;
    return blockedDays.some((b: any) =>
      b.date === form.date && (b.branch_id === null || !form.branch_id || b.branch_id === form.branch_id)
    );
  }, [form.date, form.branch_id, blockedDays]);

  const blockedReason = useMemo(() => {
    if (!form.date) return "";
    const entry = blockedDays.find((b: any) =>
      b.date === form.date && (b.branch_id === null || !form.branch_id || b.branch_id === form.branch_id)
    );
    return entry?.reason || "";
  }, [form.date, form.branch_id, blockedDays]);

  // Generate available time slots based on branch schedule and date
  const availableSlots = useMemo(() => {
    if (!form.date || !form.branch_id) return [];
    const branch = branches.find(b => b.id === form.branch_id);
    if (!branch?.working_schedule) return [];

    const ws = branch.working_schedule as WorkingSchedule;
    const dateObj = new Date(form.date + "T12:00:00Z");
    const dayIndex = dateObj.getUTCDay();
    const dayKey = DAY_KEY_BY_INDEX[dayIndex];
    const daySchedule = ws[dayKey];

    if (!daySchedule?.enabled) return [];
    const allSlots = generateTimeSlots(daySchedule.open, daySchedule.last_appointment, daySchedule.close);

    // Filter out slots that overlap with existing appointments
    const occupiedSlots = new Set<string>();
    for (const apt of existingAppointments) {
      const [h, m] = (apt.time || "").split(":").map(Number);
      const dur = apt.duration || 30;
      let startMin = h * 60 + m;
      const endMin = startMin + dur;
      while (startMin < endMin) {
        occupiedSlots.add(`${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`);
        startMin += 30;
      }
    }

    return allSlots.filter(s => !occupiedSlots.has(s));
  }, [form.date, form.branch_id, branches, existingAppointments]);

  // Check if selected date is a non-working day
  const isNonWorkingDay = useMemo(() => {
    if (!form.date || !form.branch_id) return false;
    const branch = branches.find(b => b.id === form.branch_id);
    if (!branch?.working_schedule) return false;
    const ws = branch.working_schedule as WorkingSchedule;
    const dateObj = new Date(form.date + "T12:00:00Z");
    const dayKey = DAY_KEY_BY_INDEX[dateObj.getUTCDay()];
    return !ws[dayKey]?.enabled;
  }, [form.date, form.branch_id, branches]);

  const handleServiceChange = (id: string) => {
    const svc = services.find(s => s.id === id);
    setForm(f => ({ ...f, service_id: id, duration: svc?.duration ? String(svc.duration) : f.duration }));
  };

  const handleDateChange = (date: string) => {
    setForm(f => ({ ...f, date, time: "" })); // reset time when date changes
  };

  const handleSubmit = async () => {
    if (!clinicId || !form.date || !form.time) return;
    if (isDateBlocked || isNonWorkingDay) {
      toast.error("No se puede agendar en ese día");
      return;
    }
    setSaving(true);

    try {
      // Validate blocked day
      let blockedQuery = (supabase as any)
        .from("blocked_days")
        .select("date, reason, branch_id")
        .eq("clinic_id", clinicId)
        .eq("date", form.date);

      const { data: blockedEntries } = await blockedQuery;
      const isBlocked = (blockedEntries || []).some((b: any) =>
        b.branch_id === null || !form.branch_id || b.branch_id === form.branch_id
      );
      const blockedEntry = (blockedEntries || []).find((b: any) =>
        b.branch_id === null || !form.branch_id || b.branch_id === form.branch_id
      );

      if (isBlocked) {
        toast.error(`🔒 Ese día está bloqueado${blockedEntry?.reason ? `: ${blockedEntry.reason}` : ""}`);
        setSaving(false);
        return;
      }

      // Find or create patient
      let patientId: string | null = null;
      const { data: contact } = await supabase
        .from("contacts")
        .select("patient_id")
        .eq("id", contactId)
        .single();

      if (contact?.patient_id) {
        patientId = contact.patient_id;
      } else {
        const nameParts = contactName.split(" ");
        const { data: newPatient, error: patErr } = await supabase
          .from("patients")
          .insert({
            clinic_id: clinicId,
            first_name: nameParts[0] || contactName,
            last_name: nameParts.slice(1).join(" ") || "",
            phone: contactPhone,
            email: contactEmail || null,
          })
          .select("id")
          .single();

        if (patErr) throw patErr;
        patientId = newPatient.id;
        await supabase.from("contacts").update({ patient_id: patientId }).eq("id", contactId);
      }

      // Create appointment
      const professionalId = form.professional_id === "por_definir" ? null : form.professional_id;
      const { error: aptErr } = await (supabase as any).from("appointments").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        treatment_id: form.service_id || null,
        professional_id: professionalId,
        branch_id: form.branch_id || null,
        date: form.date,
        time: form.time,
        duration: parseInt(form.duration) || 30,
        notes: form.notes || `Agendado manualmente desde chat — ${contactName}`,
        status: "pendiente",
        booking_source: "manual",
      });

      if (aptErr) throw aptErr;

      // Update conversation
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

      // Log pipeline history
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
      setForm({ service_id: "", professional_id: "por_definir", branch_id: branches.length === 1 ? branches[0]?.id || "" : "", date: "", time: "", duration: "30", notes: "" });
      onBooked?.();
    } catch (e: any) {
      toast.error(e.message || "Error al agendar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Agendar cita manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Contact info */}
          <div className="rounded-lg border border-border bg-muted/50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground">{contactPhone}</p>
            </div>
          </div>

          {/* Branch */}
          {branches.length > 1 && (
            <div>
              <Label className="text-xs text-muted-foreground">Sucursal *</Label>
              <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v, date: "", time: "" }))}>
                <SelectTrigger className="h-9 mt-1">
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

          {/* Service */}
          <div>
            <Label className="text-xs text-muted-foreground">Servicio</Label>
            <Select value={form.service_id} onValueChange={handleServiceChange}>
              <SelectTrigger className="h-9 mt-1">
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
          <div>
            <Label className="text-xs text-muted-foreground">Profesional</Label>
            <Select value={form.professional_id} onValueChange={v => setForm(f => ({ ...f, professional_id: v }))}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Seleccionar profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="por_definir">
                  <span className="text-muted-foreground italic">Por definir</span>
                </SelectItem>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs text-muted-foreground">Fecha *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={e => handleDateChange(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="h-9 mt-1"
              disabled={!form.branch_id && branches.length > 1}
            />
            {isDateBlocked && (
              <div className="flex items-center gap-1.5 mt-1.5 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Día bloqueado{blockedReason ? `: ${blockedReason}` : ""}</span>
              </div>
            )}
            {isNonWorkingDay && !isDateBlocked && (
              <div className="flex items-center gap-1.5 mt-1.5 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Esta sede no atiende ese día</span>
              </div>
            )}
          </div>

          {/* Time slots */}
          {form.date && !isDateBlocked && !isNonWorkingDay && form.branch_id && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Hora * 
                {availableSlots.length > 0 && (
                  <span className="text-muted-foreground font-normal">({availableSlots.length} disponibles)</span>
                )}
              </Label>
              {availableSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-[120px] overflow-y-auto">
                  {availableSlots.map(slot => (
                    <Badge
                      key={slot}
                      variant={form.time === slot ? "default" : "outline"}
                      className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${
                        form.time === slot
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/10 hover:text-primary"
                      }`}
                      onClick={() => setForm(f => ({ ...f, time: slot }))}
                    >
                      {slot}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">No hay horarios disponibles para este día.</p>
              )}
            </div>
          )}

          {/* Duration */}
          <div>
            <Label className="text-xs text-muted-foreground">Duración (min)</Label>
            <Input
              type="number"
              value={form.duration}
              min={5}
              max={480}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="h-9 mt-1 w-24"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              className="mt-1 min-h-[60px]"
              maxLength={1000}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.date || !form.time || isDateBlocked || isNonWorkingDay || (!form.branch_id && branches.length > 0)}
              className="flex-1"
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
