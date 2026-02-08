import { TrendingUp, Users, Send, MousePointerClick, UserCheck, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { label: "Contactos totales", value: "1,248", change: "+12%", icon: Users, color: "text-primary" },
  { label: "Mensajes enviados", value: "3,540", change: "+8%", icon: Send, color: "text-accent" },
  { label: "Tasa de apertura", value: "68%", change: "+3%", icon: MousePointerClick, color: "text-[hsl(var(--success))]" },
  { label: "Conversiones", value: "87", change: "+15%", icon: UserCheck, color: "text-[hsl(var(--warning))]" },
  { label: "Costo por lead", value: "$4.20", change: "-5%", icon: DollarSign, color: "text-primary" },
  { label: "ROI Campañas", value: "320%", change: "+22%", icon: TrendingUp, color: "text-[hsl(var(--success))]" },
];

const MarketingKPIs = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
            <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-[hsl(var(--success))] mt-1">{kpi.change} vs. mes anterior</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen del embudo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { stage: "Nuevos", count: 420, pct: 100 },
            { stage: "Contactados", count: 310, pct: 74 },
            { stage: "Interesados", count: 180, pct: 43 },
            { stage: "Cita agendada", count: 120, pct: 29 },
            { stage: "Convertidos", count: 87, pct: 21 },
          ].map((s) => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-28 shrink-0">{s.stage}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${s.pct}%` }} />
              </div>
              <span className="text-sm font-medium text-foreground w-12 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default MarketingKPIs;
