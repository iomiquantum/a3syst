import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appointmentSchema, getValidationError } from "@/lib/validations";

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

type AppointmentStatus = "pendiente" | "confirmado" | "completado" | "cancelado";

const statusConfig: Record<AppointmentStatus, { label: string; emoji: string; color: string }> = {
  pendiente: { label: "Pendiente", emoji: "🟡", color: "bg-warning/10 text-warning" },
  confirmado: { label: "Confirmado", emoji: "🔵", color: "bg-info/10 text-info" },
  completado: { label: "Completado", emoji: "🟢", color: "bg-success/10 text-success" },
  cancelado: { label: "Cancelado", emoji: "🔴", color: "bg-destructive/10 text-destructive" },
};

const AgendaPage = () => {
  const { clinicId } = useClinic();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any | null>(null);
  const [view, setView] = useState<"semana" | "mes">("semana");
  const [form, setForm] = useState({
    patient_id: "", treatment_id: "", professional_id: "", branch_id: "",
    date: "", time: "", duration: "30", notes: "",
  });

  const getWeekStart = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  };

  const getWeekDates = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const fetchData = async () => {
    if (!clinicId) return;
    const startDate = formatDate(weekDates[0]);
    const endDate = formatDate(weekDates[6]);

    const [{ data: a }, { data: p }, { data: t }, { data: pr }, { data: b }] = await Promise.all([
      supabase.from("appointments").select("*, patients(first_name, last_name), treatments(name), professionals(full_name)")
        .eq("clinic_id", clinicId).gte("date", startDate).lte("date", endDate).order("date").order("time"),
      supabase.from("patients").select("id, first_name, last_name").eq("clinic_id", clinicId).order("first_name"),
      supabase.from("treatments").select("id, name, duration").eq("clinic_id", clinicId),
      supabase.from("professionals").select("id, full_name").eq("clinic_id", clinicId),
      supabase.from("branches").select("id, name").eq("clinic_id", clinicId),
    ]);
    setAppointments(a || []);
    setPatients(p || []);
    setTreatments(t || []);
    setProfessionals(pr || []);
    setBranches(b || []);
  };

  useEffect(() => { fetchData(); }, [clinicId, currentDate]);

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = formatDate(date);
    return appointments.find((a) => a.date === dateStr && a.time?.substring(0, 5) === time && a.status !== "cancelado");
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case "confirmado": return "gradient-primary";
      case "pendiente": return "bg-warning/80";
      case "completado": return "bg-success/80";
      case "cancelado": return "bg-muted";
      default: return "gradient-primary";
    }
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Estado actualizado");
    setDetailApt((prev: any) => prev ? { ...prev, status } : null);
    fetchData();
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cita eliminada");
    setDetailApt(null);
    fetchData();
  };

  const handleCreate = async () => {
    if (!clinicId) return;
    try {
      const validated = appointmentSchema.parse({
        ...form,
        duration: parseInt(form.duration) || 30,
      });
      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        patient_id: validated.patient_id,
        treatment_id: validated.treatment_id || null,
        professional_id: validated.professional_id || null,
        branch_id: validated.branch_id || null,
        date: validated.date,
        time: validated.time,
        duration: validated.duration,
        notes: validated.notes || "",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Cita creada");
      setCreateOpen(false);
      setForm({ patient_id: "", treatment_id: "", professional_id: "", branch_id: "", date: "", time: "", duration: "30", notes: "" });
      fetchData();
    } catch (e) {
      toast.error(getValidationError(e));
    }
  };

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    setForm({ ...form, treatment_id: treatmentId, duration: treatment ? String(treatment.duration) : form.duration });
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gestiona las citas de tu clínica</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Nueva Cita
          </Button>
        </div>

        {/* Create appointment dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tratamiento</Label>
                <Select value={form.treatment_id} onValueChange={handleTreatmentChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Profesional</Label>
                  <Select value={form.professional_id} onValueChange={v => setForm({ ...form, professional_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Fecha *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Hora *</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
                <div><Label>Duración (min)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} min={5} max={480} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full gradient-primary text-primary-foreground" disabled={!form.patient_id || !form.date || !form.time}>Crear Cita</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointment detail dialog */}
        <Dialog open={!!detailApt} onOpenChange={o => !o && setDetailApt(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Detalle de Cita</DialogTitle></DialogHeader>
            {detailApt && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Paciente</p><p className="font-medium text-foreground">{detailApt.patients ? `${detailApt.patients.first_name} ${detailApt.patients.last_name}` : "-"}</p></div>
                  <div><p className="text-muted-foreground">Tratamiento</p><p className="font-medium text-foreground">{detailApt.treatments?.name || "-"}</p></div>
                  <div><p className="text-muted-foreground">Profesional</p><p className="font-medium text-foreground">{detailApt.professionals?.full_name || "-"}</p></div>
                  <div><p className="text-muted-foreground">Hora</p><p className="font-medium text-foreground">{detailApt.time?.substring(0, 5)} ({detailApt.duration}min)</p></div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Estado</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(Object.keys(statusConfig) as AppointmentStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(detailApt.id, s)}
                        className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-full border-2 transition-all",
                          detailApt.status === s ? `${statusConfig[s].color} border-current` : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {statusConfig[s].emoji} {statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="destructive" size="sm" onClick={() => deleteAppointment(detailApt.id)}>
                    <X className="w-4 h-4 mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Calendar */}
        <Card className="shadow-card">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-semibold capitalize">
                  {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigateWeek(-1)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => navigateWeek(1)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={goToToday}>Hoy</Button>
                <Button variant={view === "semana" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setView("semana")}>Semana</Button>
                <Button variant={view === "mes" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setView("mes")}>Mes</Button>
              </div>
            </div>
            {/* Status legend */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              {(Object.entries(statusConfig) as [AppointmentStatus, typeof statusConfig[AppointmentStatus]][]).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span>{val.emoji}</span><span className="text-muted-foreground">{val.label}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 border-b border-border">
                  <div className="p-3" />
                  {weekDates.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{daysOfWeek[i]}</p>
                        <p className={cn("text-lg font-semibold mt-0.5", isToday ? "text-primary" : "text-foreground")}>{date.getDate()}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b border-border/50 min-h-[48px]">
                      <div className="p-2 flex items-start justify-end pr-3">
                        <span className="text-xs text-muted-foreground">{time}</span>
                      </div>
                      {weekDates.map((date, dayIndex) => {
                        const apt = getAppointmentForSlot(date, time);
                        return (
                          <div key={dayIndex} className="p-1 border-l border-border/50">
                            {apt && (
                              <button
                                onClick={() => setDetailApt(apt)}
                                className={cn(
                                  "w-full rounded-lg p-2 text-left cursor-pointer hover:opacity-90 transition-opacity text-primary-foreground",
                                  getStatusColor(apt.status)
                                )}
                              >
                                <p className="text-xs font-medium truncate">{apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "-"}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-[10px]">{apt.duration}min</span>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AgendaPage;
