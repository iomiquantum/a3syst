import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

const appointments = [
  { time: "09:00", duration: 30, patient: "María García", type: "Consulta General", day: 0 },
  { time: "10:00", duration: 60, patient: "Carlos López", type: "Control", day: 0 },
  { time: "09:30", duration: 30, patient: "Ana Martínez", type: "Odontología", day: 1 },
  { time: "11:00", duration: 30, patient: "Roberto Díaz", type: "Dermatología", day: 1 },
  { time: "08:30", duration: 60, patient: "Lucía Fernández", type: "Consulta General", day: 2 },
  { time: "14:00", duration: 30, patient: "Pedro Sánchez", type: "Control", day: 3 },
  { time: "10:00", duration: 30, patient: "Carmen Ruiz", type: "Consulta General", day: 4 },
  { time: "15:00", duration: 60, patient: "Diego Torres", type: "Dermatología", day: 4 },
];

const AgendaPage = () => {
  const [currentDate] = useState(new Date());

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
    return appointments.find((a) => a.day === dayIndex && a.time === time);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gestiona las citas de tu clínica</p>
          </div>
          <Button className="gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>

        {/* Calendar navigation */}
        <Card className="shadow-card">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-semibold">
                  {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">Hoy</Button>
                <Button variant="outline" size="sm" className="text-xs">Semana</Button>
                <Button variant="outline" size="sm" className="text-xs">Mes</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Week header */}
                <div className="grid grid-cols-8 border-b border-border">
                  <div className="p-3" /> {/* time column */}
                  {weekDates.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{daysOfWeek[i]}</p>
                        <p className={cn(
                          "text-lg font-semibold mt-0.5",
                          isToday ? "text-primary" : "text-foreground"
                        )}>
                          {date.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots */}
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
                              <div className="gradient-primary rounded-lg p-2 text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
                                <p className="text-xs font-medium truncate">{apt.patient}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-[10px]">{apt.duration}min</span>
                                </div>
                              </div>
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
