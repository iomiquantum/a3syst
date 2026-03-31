import { useState, useEffect } from "react";
import { BarChart3, DollarSign, Bot, Zap, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface ClinicUsage {
  clinic_id: string;
  clinic_name: string;
  total_calls: number;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  budget: number | null;
}

interface DailyRow {
  day: string;
  calls: number;
  cost: number;
  generator_type: string;
}

interface Props {
  clinics: any[];
}

const AdminAIConsumption = ({ clinics }: Props) => {
  const [loading, setLoading] = useState(true);
  const [clinicUsages, setClinicUsages] = useState<ClinicUsage[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("all");
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [period, setPeriod] = useState<"month" | "30d" | "7d">("month");

  const getPeriodStart = () => {
    if (period === "7d") return subDays(new Date(), 7).toISOString();
    if (period === "30d") return subDays(new Date(), 30).toISOString();
    return startOfMonth(new Date()).toISOString();
  };

  useEffect(() => {
    fetchData();
  }, [clinics, period]);

  const fetchData = async () => {
    setLoading(true);
    const since = getPeriodStart();

    // Fetch aggregated usage per clinic
    const { data: raw } = await supabase
      .from("ai_token_usage")
      .select("clinic_id, generator_type, tokens_input, tokens_output, cost_usd, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    const records = (raw || []) as any[];

    // Aggregate per clinic
    const map = new Map<string, { calls: number; input: number; output: number; cost: number }>();
    const dailyMap = new Map<string, { calls: number; cost: number; generator_type: string }>();

    records.forEach((r) => {
      const prev = map.get(r.clinic_id) || { calls: 0, input: 0, output: 0, cost: 0 };
      map.set(r.clinic_id, {
        calls: prev.calls + 1,
        input: prev.input + (r.tokens_input || 0),
        output: prev.output + (r.tokens_output || 0),
        cost: prev.cost + (r.cost_usd || 0),
      });

      const day = r.created_at?.substring(0, 10) || "unknown";
      const key = `${day}-${r.generator_type}`;
      const dp = dailyMap.get(key) || { calls: 0, cost: 0, generator_type: r.generator_type };
      dailyMap.set(key, { calls: dp.calls + 1, cost: dp.cost + (r.cost_usd || 0), generator_type: r.generator_type });
    });

    const clinicMap = new Map<string, any>();
    clinics.forEach((c) => clinicMap.set(c.id, c));

    const usages: ClinicUsage[] = [];
    map.forEach((val, clinicId) => {
      const clinic = clinicMap.get(clinicId);
      usages.push({
        clinic_id: clinicId,
        clinic_name: clinic?.name || "Desconocido",
        total_calls: val.calls,
        tokens_input: val.input,
        tokens_output: val.output,
        cost_usd: val.cost,
        budget: clinic?.monthly_token_budget_usd ?? null,
      });
    });

    usages.sort((a, b) => b.cost_usd - a.cost_usd);
    setClinicUsages(usages);

    const daily: DailyRow[] = [];
    dailyMap.forEach((val, key) => {
      const day = key.split("-").slice(0, 3).join("-");
      daily.push({ day, calls: val.calls, cost: val.cost, generator_type: val.generator_type });
    });
    daily.sort((a, b) => b.day.localeCompare(a.day));
    setDailyData(daily);

    setLoading(false);
  };

  const totalCost = clinicUsages.reduce((a, c) => a + c.cost_usd, 0);
  const totalCalls = clinicUsages.reduce((a, c) => a + c.total_calls, 0);
  const totalTokens = clinicUsages.reduce((a, c) => a + c.tokens_input + c.tokens_output, 0);

  const filteredDaily =
    selectedClinic === "all"
      ? dailyData
      : dailyData; // daily is already global; for per-clinic we'd need re-fetch

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Costo total USD</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalCalls.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Llamadas IA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{(totalTokens / 1000).toFixed(1)}k</p>
              <p className="text-[11px] text-muted-foreground">Tokens totales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{clinicUsages.length}</p>
              <p className="text-[11px] text-muted-foreground">Negocios activos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per clinic breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Consumo por negocio
          </CardTitle>
          <CardDescription>Desglose de uso y costo real de IA por cada negocio registrado</CardDescription>
        </CardHeader>
        <CardContent>
          {clinicUsages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay consumo de IA en este período.
            </p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {clinicUsages.map((cu) => {
                  const budgetPct = cu.budget ? (cu.cost_usd / cu.budget) * 100 : null;
                  return (
                    <div
                      key={cu.clinic_id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{cu.clinic_name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{cu.total_calls} llamadas</span>
                          <span>↑{(cu.tokens_input / 1000).toFixed(1)}k</span>
                          <span>↓{(cu.tokens_output / 1000).toFixed(1)}k</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">${cu.cost_usd.toFixed(4)}</p>
                          {cu.budget !== null && (
                            <p className="text-[10px] text-muted-foreground">
                              de ${cu.budget.toFixed(2)} presup.
                            </p>
                          )}
                        </div>
                        {budgetPct !== null && (
                          <Badge
                            variant={budgetPct >= 100 ? "destructive" : budgetPct >= 80 ? "secondary" : "outline"}
                            className="text-[10px] min-w-[50px] justify-center"
                          >
                            {budgetPct.toFixed(0)}%
                          </Badge>
                        )}
                        {cu.budget === null && (
                          <Badge variant="outline" className="text-[10px]">Open</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Daily activity log */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Actividad diaria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {filteredDaily.slice(0, 60).map((d, i) => (
                <div
                  key={`${d.day}-${d.generator_type}-${i}`}
                  className="flex items-center justify-between py-2 px-3 rounded border border-border/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{d.day}</span>
                    <Badge variant="outline" className="text-[10px]">{d.generator_type}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{d.calls} calls</span>
                    <span className="font-medium text-foreground">${d.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAIConsumption;
