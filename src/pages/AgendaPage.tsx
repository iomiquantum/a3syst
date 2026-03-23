import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, X, Check, Calendar as CalIcon,
  Search, Bot, CheckCircle2, XCircle, AlertCircle, User
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appointmentSchema, getValidationError } from "@/lib/validations";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

type AptStatus = "pendiente" | "confirmado" | "completado" | "cancelado";

const STATUS_CFG: Record<AptStatus, { label: string; dot: string; bg: string; text: string }> = {
  pendiente: { label: "Pendiente", dot: "bg-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/0.15)] border-[hsl(var(--warning)/0.3)]", text: "text-[hsl(var(--warning))]" },
  confirmado: { label: "Confirmado", dot: "bg-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/0.15)] border-[hsl(var(--info)/0.3)]", text: "text-[hsl(var(--info))]" },
  completado: { label: "Completado", dot: "bg-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.15)] border-[hsl(var(--success)/0.3)]", text: "text-[hsl(var(--success))]" },
  cancelado: { label: "Cancelado", dot: "bg-muted-foreground", bg: "bg-muted/50 border-border", text: "text-muted-foreground" },
};

const getWeekStart = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const fmtDate = (d: Date) => d.toISOString().split("T")[0];

const AgendaPage = () => {
  const { clinicId } = useClinic();
  const { labels } = useBusinessLabels();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"dia" | "semana" | "mes">("semana");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPro, setFilterPro] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [saleDialogApt, setSaleDialogApt] = useState<any | null>(null);
  const [saleAmount, setSaleAmount] = useState("");
  const [salePaymentMethod, setSalePaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [form, setForm] = useState({
    patient_id: "", treatment_id: "", professional_id: "",
    date: "", time: "", duration: "30", notes: "",
  });

  const weekDates = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const todayStr = fmtDate(new Date());

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const startDate = fmtDate(weekDates[0]);
    const endDate = fmtDate(weekDates[6]);

    const [{ data: a }, { data: p }, { data: t }, { data: pr }, { data: pm }] = await Promise.all([
      supabase.from("appointments")
        .select("*, patients(first_name, last_name), treatments(name, price), professionals(full_name)")
        .eq("clinic_id", clinicId).gte("date", startDate).lte("date", endDate)
        .order("date").order("time") as any,
      supabase.from("patients").select("id, first_name, last_name").eq("clinic_id", clinicId).order("first_name"),
      supabase.from("treatments").select("id, name, duration, price").eq("clinic_id", clinicId),
      supabase.from("professionals").select("id, full_name").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("payment_methods").select("id, name").eq("clinic_id", clinicId),
    ]);
    setAppointments(a || []);
    setPatients(p || []);
    setTreatments(t || []);
    setProfessionals(pr || []);
    setPaymentMethods(pm || []);
    setLoading(false);
  }, [clinicId, weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Today stats
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const todayStats = {
    total: todayAppts.length,
    confirmadas: todayAppts.filter(a => a.status === "confirmado").length,
    pendientes: todayAppts.filter(a => a.status === "pendiente").length,
    canceladas: todayAppts.filter(a => a.status === "cancelado").length,
  };

  // Pending approvals
  const pendingApprovals = todayAppts.filter(a => a.status === "pendiente");

  // Filter appointments
  const filteredAppts = useMemo(() => {
    let list = appointments;
    if (filterPro !== "todos") list = list.filter(a => a.professional_id === filterPro);
    if (filterStatus !== "todos") list = list.filter(a => a.status === filterStatus);
    return list;
  }, [appointments, filterPro, filterStatus]);

  const getAptsForSlot = (dateStr: string, time: string) =>
    filteredAppts.filter(a => a.date === dateStr && a.time?.substring(0, 5) === time);

  // Actions
  const updateStatus = async (id: string, status: AptStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const msgs: Record<string, string> = {
      confirmado: "✅ Cita confirmada",
      completado: "✅ Cita completada",
      cancelado: "❌ Cita cancelada",
    };
    toast.success(msgs[status] || "Estado actualizado");
    if (detailApt?.id === id) setDetailApt((prev: any) => prev ? { ...prev, status } : null);
    
    // When completing, offer to register a sale
    if (status === "completado") {
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        setSaleAmount(apt.treatments?.price ? String(apt.treatments.price) : "");
        setSalePaymentMethod(paymentMethods[0]?.id || "");
        setSaleDialogApt(apt);
      }
    }
    fetchData();
  };

  const handleRegisterSale = async () => {
    if (!clinicId || !saleDialogApt) return;
    const { error } = await supabase.from("sales").insert({
      clinic_id: clinicId,
      patient_id: saleDialogApt.patient_id,
      treatment_id: saleDialogApt.treatment_id || null,
      amount: parseFloat(saleAmount) || 0,
      payment_method_id: salePaymentMethod || null,
      status: "pendiente" as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("💰 Venta registrada");
    setSaleDialogApt(null);
  };

  const handleCreate = async () => {
    if (!clinicId) return;
    try {
      const validated = appointmentSchema.parse({ ...form, duration: parseInt(form.duration) || 30 });
      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        patient_id: validated.patient_id,
        treatment_id: validated.treatment_id || null,
        professional_id: validated.professional_id || null,
        date: validated.date,
        time: validated.time,
        duration: validated.duration,
        notes: validated.notes || "",
        status: "pendiente",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("✅ Cita creada");
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const resetForm = () => setForm({ patient_id: "", treatment_id: "", professional_id: "", date: "", time: "", duration: "30", notes: "" });

  const handleTreatmentChange = (tid: string) => {
    const t = treatments.find(x => x.id === tid);
    setForm({ ...form, treatment_id: tid, duration: t ? String(t.duration) : form.duration });
  };

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const openSlot = (dateStr: string, time: string) => {
    setForm({ ...form, date: dateStr, time });
    setCreateOpen(true);
  };

  const filteredPatients = patientSearch
    ? patients.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 8)
    : patients.slice(0, 20);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📅 {labels.appointments || "Agenda"}</h1>
            <p className="text-sm text-muted-foreground">Autopilot de agenda</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--success))]">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" /> Autopilot activo
            </span>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}
              className="gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Nueva cita
            </Button>
          </div>
        </div>

        {/* ═══ TODAY STATS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Hoy", value: todayStats.total, icon: CalIcon, color: "bg-primary" },
            { label: "Confirmadas", value: todayStats.confirmadas, icon: CheckCircle2, color: "bg-[hsl(var(--info))]" },
            { label: "Pendientes", value: todayStats.pendientes, icon: AlertCircle, color: "bg-[hsl(var(--warning))]" },
            { label: "Canceladas", value: todayStats.canceladas, icon: XCircle, color: "bg-muted-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
                  <s.icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{loading ? "—" : s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ AI SUGGESTIONS ═══ */}
        {!loading && pendingApprovals.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Necesita tu aprobación
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {pendingApprovals.slice(0, 6).map(apt => (
                <Card key={apt.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--warning)/0.1)] shrink-0">
                        <CalIcon className="w-4 h-4 text-[hsl(var(--warning))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Cita pendiente</p>
                        <p className="text-sm text-foreground mt-0.5 truncate">
                          {apt.patients?.first_name} {apt.patients?.last_name} a las {apt.time?.slice(0, 5)} — {apt.treatments?.name || "Sin servicio"}
                          {apt.professionals?.full_name ? ` con ${apt.professionals.full_name}` : ""}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => updateStatus(apt.id, "confirmado")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-xs font-medium hover:bg-[hsl(var(--success)/0.25)] transition-colors">
                            <Check className="w-3.5 h-3.5" /> Confirmar
                          </button>
                          <button onClick={() => updateStatus(apt.id, "cancelado")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors">
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ═══ CALENDAR ═══ */}
        <Card>
          <CardContent className="p-4">
            {/* Nav */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-foreground capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigateWeek(-1)} className="p-1.5 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => navigateWeek(1)} className="p-1.5 rounded hover:bg-muted"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                {(["dia", "semana", "mes"] as const).map(v => (
                  <Button key={v} variant={view === v ? "default" : "outline"} size="sm"
                    className="text-xs"
                    onClick={() => setView(v)}>
                    {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Select value={filterPro} onValueChange={setFilterPro}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los profesionales</SelectItem>
                  {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(Object.keys(STATUS_CFG) as AptStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Legend */}
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {(Object.entries(STATUS_CFG) as [AptStatus, typeof STATUS_CFG[AptStatus]][]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                    <span className="text-[10px] text-muted-foreground">{v.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <Bot className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">IA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-[hsl(var(--info))]" />
                  <span className="text-[10px] text-muted-foreground">Manual</span>
                </div>
              </div>
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 border-b border-border">
                    <div className="p-2" />
                    {weekDates.map((date, i) => {
                      const isToday = fmtDate(date) === todayStr;
                      return (
                        <div key={i} className={cn("p-2 text-center border-l border-border", isToday && "bg-primary/5")}>
                          <p className="text-[10px] text-muted-foreground">{DAYS[i]}</p>
                          <p className={cn("text-sm font-semibold mt-0.5", isToday ? "text-primary" : "text-foreground")}>{date.getDate()}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time rows */}
                  <div className="max-h-[500px] overflow-y-auto">
                    {TIME_SLOTS.map(time => (
                      <div key={time} className="grid grid-cols-8 border-b border-border/30 min-h-[44px]">
                        <div className="p-1.5 flex items-start justify-end pr-2">
                          <span className="text-[10px] text-muted-foreground">{time}</span>
                        </div>
                        {weekDates.map((date, di) => {
                          const dateStr = fmtDate(date);
                          const slotApts = getAptsForSlot(dateStr, time);
                          return (
                            <div key={di}
                              className="border-l border-border/30 p-0.5 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => slotApts.length === 0 && openSlot(dateStr, time)}>
                              {slotApts.map(apt => {
                                const cfg = STATUS_CFG[apt.status as AptStatus] || STATUS_CFG.pendiente;
                                return (
                                  <button key={apt.id}
                                    onClick={e => { e.stopPropagation(); setDetailApt(apt); }}
                                    className={cn("w-full rounded-md p-1.5 text-left border transition-all hover:scale-[1.02]", cfg.bg)}>
                                    <div className="flex items-center gap-1">
                                      <p className={cn("text-[10px] font-medium truncate flex-1", cfg.text)}>
                                        {apt.patients?.first_name} {apt.patients?.last_name}
                                      </p>
                                      {apt.booking_source === "ai_auto" ? (
                                        <Bot className="w-3 h-3 text-primary shrink-0" />
                                      ) : (
                                        <User className="w-3 h-3 text-[hsl(var(--info))] shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground truncate">
                                      {apt.treatments?.name || ""} · {apt.duration}min
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ DETAIL DIALOG ═══ */}
      <Dialog open={!!detailApt} onOpenChange={o => !o && setDetailApt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalle de cita</DialogTitle></DialogHeader>
          {detailApt && (() => {
            const cfg = STATUS_CFG[detailApt.status as AptStatus] || STATUS_CFG.pendiente;
            return (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Paciente</p>
                    <p className="font-medium">{detailApt.patients?.first_name} {detailApt.patients?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Servicio</p>
                    <p className="font-medium">{detailApt.treatments?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Profesional</p>
                    <p className="font-medium">{detailApt.professionals?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Horario</p>
                    <p className="font-medium">{detailApt.date} · {detailApt.time?.slice(0, 5)} ({detailApt.duration}min)</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Estado</p>
                  <span className={cn("text-xs font-medium px-3 py-1.5 rounded-full border", cfg.bg, cfg.text)}>{cfg.label}</span>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Agendado por</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {detailApt.booking_source === "ai_auto" ? (
                      <><Bot className="w-3.5 h-3.5 text-[#8B5CF6]" /><span className="text-sm font-medium">IA (automático)</span></>
                    ) : detailApt.booking_source === "ai_manual" ? (
                      <><Bot className="w-3.5 h-3.5 text-[#8B5CF6]" /><span className="text-sm font-medium">IA (asistido)</span></>
                    ) : (
                      <><User className="w-3.5 h-3.5 text-blue-400" /><span className="text-sm font-medium">Manual (operador)</span></>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {detailApt.status === "pendiente" && (
                    <Button size="sm" onClick={() => updateStatus(detailApt.id, "confirmado")}
                      className="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.25)] border-0">
                      <Check className="w-3.5 h-3.5 mr-1" /> Confirmar
                    </Button>
                  )}
                  {detailApt.status === "confirmado" && (
                    <Button size="sm" onClick={() => updateStatus(detailApt.id, "completado")}
                      className="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.25)] border-0">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completar
                    </Button>
                  )}
                  {detailApt.status !== "cancelado" && detailApt.status !== "completado" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(detailApt.id, "cancelado")}
                      className="border-destructive/20 text-destructive hover:bg-destructive/10">
                      <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); resetForm(); setPatientSearch(""); } else setCreateOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva cita</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Paciente *</Label>
              <div className="mt-1">
                <Input placeholder="Buscar paciente..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                  className="h-9 mb-1" />
                {form.patient_id && (
                  <span className="text-xs text-primary">
                    ✓ {patients.find(p => p.id === form.patient_id)?.first_name} {patients.find(p => p.id === form.patient_id)?.last_name}
                  </span>
                )}
                {patientSearch && !form.patient_id && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-popover">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patient_id: p.id }); setPatientSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted truncate">
                        {p.first_name} {p.last_name}
                      </button>
                    ))}
                    {filteredPatients.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Servicio</Label>
              <Select value={form.treatment_id} onValueChange={handleTreatmentChange}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Profesional</Label>
              <Select value={form.professional_id} onValueChange={v => setForm({ ...form, professional_id: v })}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Fecha *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hora *</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Duración</Label>
                <Input type="number" value={form.duration} min={5} max={480}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="bg-white/5 border-white/10 text-foreground mt-1 min-h-[60px]" maxLength={1000} />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} className="flex-1 border-white/10 hover:bg-white/5">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.patient_id || !form.date || !form.time}
                className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90">
                Crear cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ REGISTER SALE DIALOG ═══ */}
      <Dialog open={!!saleDialogApt} onOpenChange={o => !o && setSaleDialogApt(null)}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-sm">
          <DialogHeader><DialogTitle>💰 Registrar venta</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Cita de <span className="text-foreground font-medium">{saleDialogApt?.patients?.first_name} {saleDialogApt?.patients?.last_name}</span> completada.
              ¿Registrar la venta?
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Monto</Label>
              <Input type="number" value={saleAmount} onChange={e => setSaleAmount(e.target.value)}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1" min={0} />
            </div>
            {paymentMethods.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Método de pago</Label>
                <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                  <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setSaleDialogApt(null)} className="flex-1 border-white/10 hover:bg-white/5">Omitir</Button>
              <Button onClick={handleRegisterSale} disabled={!saleAmount}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white hover:opacity-90">
                Registrar venta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AgendaPage;
