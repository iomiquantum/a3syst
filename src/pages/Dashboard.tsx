import { useState, useEffect } from "react";
import { Users, Calendar, TrendingUp, Clock, ArrowUpRight, MessageSquare, DollarSign } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { clinicId, clinicName } = useClinic();
  const [counts, setCounts] = useState({ patients: 0, todayAppts: 0, totalSales: 0, pendingSales: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    const fetchDashboard = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [{ count: patientCount }, { data: todayAppts }, { data: sales }, { data: recent }] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("appointments").select("*, patients(first_name, last_name), treatments(name)").eq("clinic_id", clinicId).eq("date", today).order("time"),
        supabase.from("sales").select("amount, discount, status").eq("clinic_id", clinicId),
        supabase.from("patients").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(4),
      ]);

      const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.amount) - (Number(s.amount) * Number(s.discount) / 100), 0);

      setCounts({
        patients: patientCount || 0,
        todayAppts: (todayAppts || []).length,
        totalSales,
        pendingSales: (sales || []).filter(s => s.status === "pendiente").length,
      });
      setTodayAppointments(todayAppts || []);
      setRecentPatients(recent || []);
    };
    fetchDashboard();
  }, [clinicId]);

  const stats = [
    { label: "Pacientes Totales", value: counts.patients.toLocaleString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Citas Hoy", value: counts.todayAppts.toString(), icon: Calendar, color: "text-info", bg: "bg-info/10" },
    { label: "Ingresos Totales", value: `$${counts.totalSales.toLocaleString()}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" },
    { label: "Ventas Pendientes", value: counts.pendingSales.toString(), icon: MessageSquare, color: "text-warning", bg: "bg-warning/10" },
  ];

  const initials = (p: any) => `${(p.first_name || "")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Resumen general — {clinicName}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
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
              <CardTitle className="text-lg font-semibold">Citas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No hay citas programadas para hoy</p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium w-12">{apt.time?.slice(0, 5)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{apt.patients?.first_name} {apt.patients?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.treatments?.name || "Sin tratamiento"}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        apt.status === "confirmado" ? "bg-info/10 text-info" :
                        apt.status === "completado" ? "bg-success/10 text-success" :
                        apt.status === "cancelado" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>{apt.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPatients.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No hay pacientes registrados aún</p>
              ) : (
                <div className="space-y-3">
                  {recentPatients.map((patient: any) => (
                    <div key={patient.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary-foreground">{initials(patient)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{patient.first_name} {patient.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{patient.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
