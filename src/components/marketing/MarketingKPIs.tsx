import { Users, Send, UserCheck, TrendingUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketingKPIs } from "@/hooks/useMarketingKPIs";

import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";

const stageLabels: Record<string, string> = Object.fromEntries(
  EMBUDO_STAGES.filter(s => s.key !== "todos").map(s => [s.key, s.label])
);

const calcChange = (current: number, previous: number): string => {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
};

const MarketingKPIs = () => {
  const {
    totalContacts, newContactsThisMonth, newContactsLastMonth,
    conversationsThisMonth, convertedThisMonth, convertedLastMonth,
    funnelCounts, loading,
  } = useMarketingKPIs();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const kpis = [
    { label: "Contactos totales", value: totalContacts.toLocaleString(), icon: Users, color: "text-primary", change: "" },
    { label: "Nuevos este mes", value: newContactsThisMonth.toLocaleString(), icon: TrendingUp, color: "text-accent", change: calcChange(newContactsThisMonth, newContactsLastMonth) },
    { label: "Conversaciones este mes", value: conversationsThisMonth.toLocaleString(), icon: MessageSquare, color: "text-[hsl(var(--info))]", change: "" },
    { label: "Convertidos este mes", value: convertedThisMonth.toLocaleString(), icon: UserCheck, color: "text-[hsl(var(--success))]", change: calcChange(convertedThisMonth, convertedLastMonth) },
  ];

  const maxFunnel = Math.max(...funnelCounts.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              {kpi.change && (
                <p className={`text-xs mt-1 ${kpi.change.startsWith("+") ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                  {kpi.change} vs. mes anterior
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embudo de contactos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelCounts.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">{stageLabels[f.stage] || f.stage}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all"
                    style={{ width: `${Math.round((f.count / maxFunnel) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-12 text-right">{f.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingKPIs;
