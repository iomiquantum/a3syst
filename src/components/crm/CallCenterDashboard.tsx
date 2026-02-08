import { Phone, PhoneOff, Users, TrendingUp, UserCheck, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallCenterMetrics } from "@/hooks/useCallCenterMetrics";
import { FUNNEL_STAGES } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STAGE_COLORS: Record<string, string> = {
  nuevos: "hsl(217, 91%, 60%)",
  contactado: "hsl(45, 93%, 47%)",
  interesado: "hsl(24, 95%, 53%)",
  cita_agendada: "hsl(271, 91%, 65%)",
  convertido: "hsl(142, 71%, 45%)",
  perdido: "hsl(0, 72%, 51%)",
};

const CallCenterDashboard = () => {
  const { metrics, loading, period, setPeriod } = useCallCenterMetrics();

  if (loading || !metrics) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const periodOptions = [
    { value: "week" as const, label: "7 días" },
    { value: "month" as const, label: "Este mes" },
    { value: "3months" as const, label: "3 meses" },
  ];

  const answerRate = metrics.totalCalls > 0 ? ((metrics.answeredCalls / metrics.totalCalls) * 100).toFixed(1) : "0";

  const chartData = metrics.dailyCalls.map(d => ({
    ...d,
    label: format(new Date(d.date), "d MMM", { locale: es }),
  }));

  const pieData = metrics.stageDistribution.map(s => ({
    name: FUNNEL_STAGES.find(f => f.value === s.stage)?.label || s.stage,
    value: s.count,
    fill: STAGE_COLORS[s.stage] || "hsl(var(--muted))",
  }));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Métricas del Call Center
        </h2>
        <div className="flex border border-border rounded-md overflow-hidden">
          {periodOptions.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalContacts}</p>
              <p className="text-xs text-muted-foreground">Contactos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Llamadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{answerRate}%</p>
              <p className="text-xs text-muted-foreground">Tasa respuesta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conversión</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily calls chart */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Llamadas por día</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="calls" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="answered" name="Contestadas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sin datos en este período</p>
            )}
          </CardContent>
        </Card>

        {/* Funnel distribution pie */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Distribución del embudo</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sin contactos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent performance table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm">Rendimiento por agente</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.agentMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Agente</th>
                    <th className="text-center py-2 px-3">Llamadas</th>
                    <th className="text-center py-2 px-3">Contestadas</th>
                    <th className="text-center py-2 px-3">Sin respuesta</th>
                    <th className="text-center py-2 px-3">Conversiones</th>
                    <th className="text-center py-2 px-3">% Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.agentMetrics.map(a => (
                    <tr key={a.agentId} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 px-3 font-medium text-foreground">{a.agentName}</td>
                      <td className="text-center py-2.5 px-3">{a.totalCalls}</td>
                      <td className="text-center py-2.5 px-3 text-[hsl(var(--success))]">{a.answered}</td>
                      <td className="text-center py-2.5 px-3 text-destructive">{a.noAnswer}</td>
                      <td className="text-center py-2.5 px-3">{a.conversions}</td>
                      <td className="text-center py-2.5 px-3">
                        {a.totalCalls > 0 ? ((a.answered / a.totalCalls) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No hay llamadas registradas en este período</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenterDashboard;
