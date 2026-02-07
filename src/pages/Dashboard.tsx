import {
  Users,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Pacientes Totales", value: "1,248", change: "+12%", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { label: "Citas Hoy", value: "24", change: "+3", icon: Calendar, color: "text-info", bg: "bg-info/10" },
  { label: "Ingresos del Mes", value: "$45,200", change: "+8.2%", icon: DollarSign, color: "text-success", bg: "bg-success/10" },
  { label: "Mensajes Pendientes", value: "7", change: "-2", icon: MessageSquare, color: "text-warning", bg: "bg-warning/10" },
];

const upcomingAppointments = [
  { time: "09:00", patient: "María García", type: "Consulta General", status: "confirmada" },
  { time: "09:30", patient: "Carlos López", type: "Control", status: "pendiente" },
  { time: "10:00", patient: "Ana Martínez", type: "Odontología", status: "confirmada" },
  { time: "10:30", patient: "Roberto Díaz", type: "Dermatología", status: "confirmada" },
  { time: "11:00", patient: "Lucía Fernández", type: "Consulta General", status: "pendiente" },
  { time: "11:30", patient: "Pedro Sánchez", type: "Control", status: "confirmada" },
];

const recentPatients = [
  { name: "María García", email: "maria@email.com", lastVisit: "Hoy", initials: "MG" },
  { name: "Carlos López", email: "carlos@email.com", lastVisit: "Ayer", initials: "CL" },
  { name: "Ana Martínez", email: "ana@email.com", lastVisit: "Hace 2 días", initials: "AM" },
  { name: "Roberto Díaz", email: "roberto@email.com", lastVisit: "Hace 3 días", initials: "RD" },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Resumen general de tu clínica — IOMI Clínicas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs font-medium text-success">{stat.change}</span>
                      <span className="text-xs text-muted-foreground">vs mes anterior</span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Próximas Citas</CardTitle>
                <span className="text-sm text-primary cursor-pointer hover:underline">Ver todas</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map((apt, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium w-12">{apt.time}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{apt.patient}</p>
                        <p className="text-xs text-muted-foreground">{apt.type}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${apt.status === "confirmada" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{apt.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Pacientes Recientes</CardTitle>
                <span className="text-sm text-primary cursor-pointer hover:underline">Ver todos</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPatients.map((patient, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary-foreground">{patient.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{patient.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{patient.lastVisit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
