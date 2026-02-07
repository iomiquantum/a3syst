import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

type AppointmentStatus = "pendiente" | "confirmado" | "completado" | "cancelado";

interface Appointment {
  id: number;
  time: string;
  duration: number;
  patient: string;
  treatment: string;
  professional: string;
  day: number;
  status: AppointmentStatus;
  paymentId?: string;
}

const initialAppointments: Appointment[] = [
  { id: 1, time: "09:00", duration: 30, patient: "María García", treatment: "Consulta General", professional: "Dr. Juan Pérez", day: 0, status: "confirmado" },
  { id: 2, time: "10:00", duration: 60, patient: "Carlos López", treatment: "Blanqueamiento", professional: "Dr. Juan Pérez", day: 0, status: "pendiente" },
  { id: 3, time: "09:30", duration: 30, patient: "Ana Martínez", treatment: "Limpieza dental", professional: "Dra. Laura Gómez", day: 1, status: "confirmado" },
  { id: 4, time: "11:00", duration: 30, patient: "Roberto Díaz", treatment: "Control anual", professional: "Dra. Laura Gómez", day: 1, status: "pendiente" },
  { id: 5, time: "08:30", duration: 60, patient: "Lucía Fernández", treatment: "Consulta General", professional: "Dr. Martín Rodríguez", day: 2, status: "completado" },
  { id: 6, time: "14:00", duration: 30, patient: "Pedro Sánchez", treatment: "Control anual", professional: "Dr. Juan Pérez", day: 3, status: "cancelado" },
  { id: 7, time: "10:00", duration: 30, patient: "Carmen Ruiz", treatment: "Consulta General", professional: "Dra. Sofía Hernández", day: 4, status: "confirmado" },
  { id: 8, time: "15:00", duration: 60, patient: "Diego Torres", treatment: "Extracción", professional: "Dr. Juan Pérez", day: 4, status: "pendiente" },
];

const statusConfig: Record<AppointmentStatus, { label: string; emoji: string; color: string }> = {
  pendiente: { label: "Pendiente", emoji: "🟡", color: "bg-warning/10 text-warning" },
  confirmado: { label: "Confirmado", emoji: "🔵", color: "bg-info/10 text-info" },
  completado: { label: "Completado", emoji: "🟢", color: "bg-success/10 text-success" },
  cancelado: { label: "Cancelado", emoji: "🔴", color: "bg-destructive/10 text-destructive" },
};

const AgendaPage = () => {
  const [currentDate] = useState(new Date());
  const [appointments, setAppointments] = useState(initialAppointments);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [view, setView] = useState<"semana" | "mes">("semana");

  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  const getAppointmentForSlot = (dayIndex: number, time: string) => {
    return appointments.find((a) => a.day === dayIndex && a.time === time && a.status !== "cancelado");
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

  const updateStatus = (id: number, status: AppointmentStatus) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    setDetailApt(prev => prev ? { ...prev, status } : null);
  };

  const deleteAppointment = (id: number) => {
    setAppointments(appointments.filter(a => a.id !== id));
    setDetailApt(null);
  };

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
              <div><Label>Paciente *</Label><Input placeholder="Buscar paciente..." /></div>
              <div>
                <Label>Tratamiento *</Label>
                <Select><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {["Limpieza dental","Consulta general","Blanqueamiento","Control anual","Extracción"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profesional *</Label>
                <Select><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {["Dr. Juan Pérez","Dra. Laura Gómez","Dr. Martín Rodríguez","Dra. Sofía Hernández"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Fecha *</Label><Input type="date" /></div>
                <div><Label>Hora *</Label><Input type="time" /></div>
              </div>
              <div>
                <Label>Datos del pago (ID operación)</Label>
                <Input placeholder="ID de venta o dejar vacío para Sin cargo" />
              </div>
              <Button className="w-full gradient-primary text-primary-foreground">Crear Cita</Button>
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
                  <div><p className="text-muted-foreground">Paciente</p><p className="font-medium text-foreground">{detailApt.patient}</p></div>
                  <div><p className="text-muted-foreground">Tratamiento</p><p className="font-medium text-foreground">{detailApt.treatment}</p></div>
                  <div><p className="text-muted-foreground">Profesional</p><p className="font-medium text-foreground">{detailApt.professional}</p></div>
                  <div><p className="text-muted-foreground">Hora</p><p className="font-medium text-foreground">{detailApt.time} ({detailApt.duration}min)</p></div>
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
                  <Button variant="outline" className="flex-1">Reprogramar</Button>
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
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">Hoy</Button>
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
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const apt = getAppointmentForSlot(dayIndex, time);
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
                                <p className="text-xs font-medium truncate">{apt.patient}</p>
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
