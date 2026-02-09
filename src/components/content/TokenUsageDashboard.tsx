import { useState } from "react";
import { BarChart3, Zap, TrendingUp, Clock, Cpu, Image, FileText, Video, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTokenUsage, type TimeRange } from "@/hooks/useTokenUsage";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
  { value: "all", label: "Todo" },
];

const generatorLabels: Record<string, { label: string; icon: typeof Image; color: string }> = {
  image: { label: "Imágenes", icon: Image, color: "hsl(258, 65%, 58%)" },
  copy: { label: "Copies", icon: FileText, color: "hsl(200, 80%, 55%)" },
  "image+copy": { label: "Imagen + Copy", icon: Zap, color: "hsl(152, 60%, 45%)" },
  video: { label: "Video", icon: Video, color: "hsl(38, 92%, 55%)" },
  agent: { label: "Agente IA", icon: Bot, color: "hsl(0, 72%, 55%)" },
};

const PIE_COLORS = ["hsl(258, 65%, 58%)", "hsl(200, 80%, 55%)", "hsl(152, 60%, 45%)", "hsl(38, 92%, 55%)", "hsl(0, 72%, 55%)", "hsl(280, 60%, 55%)"];

const TokenUsageDashboard = () => {
  const [range, setRange] = useState<TimeRange>("month");
  const { records, loading, getSummary, getDailyData, getHourlyData } = useTokenUsage();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = getSummary(range);
  const chartData = range === "today" ? getHourlyData(range) : getDailyData(range);

  const typeData = Object.entries(summary.byType).map(([type, data]) => ({
    name: generatorLabels[type]?.label || type,
    tokens: data.input + data.output,
    calls: data.calls,
  }));

  const modelData = Object.entries(summary.byModel).map(([model, data]) => ({
    name: model,
    tokens: data.input + data.output,
    calls: data.calls,
  }));

  const totalTokens = summary.totalInput + summary.totalOutput;

  const chartConfig = {
    tokens: { label: "Tokens", color: "hsl(258, 65%, 58%)" },
    calls: { label: "Llamadas", color: "hsl(200, 80%, 55%)" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Consumo de Tokens</h2>
        <p className="text-sm text-muted-foreground">
          Monitorea el uso de tokens de IA en generación de imágenes, copies y videos.
        </p>
      </div>

      {/* Time range selector */}
      <div className="flex gap-2">
        {timeRanges.map(tr => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              range === tr.value
                ? "gradient-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
              </p>
              <p className="text-[11px] text-muted-foreground">Tokens totales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{summary.totalCalls}</p>
              <p className="text-[11px] text-muted-foreground">Llamadas IA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {summary.totalInput >= 1000 ? `${(summary.totalInput / 1000).toFixed(1)}k` : summary.totalInput}
              </p>
              <p className="text-[11px] text-muted-foreground">Tokens entrada</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {summary.totalOutput >= 1000 ? `${(summary.totalOutput / 1000).toFixed(1)}k` : summary.totalOutput}
              </p>
              <p className="text-[11px] text-muted-foreground">Tokens salida</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Timeline chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {range === "today" ? "Consumo por hora" : "Consumo diario"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sin datos para este período</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey={range === "today" ? "hour" : "day"}
                    tickFormatter={(v) => {
                      try {
                        if (range === "today") return v.substring(11, 16);
                        return format(new Date(v), "d MMM", { locale: es });
                      } catch { return v; }
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" fill="hsl(258, 65%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* By generator type */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Por tipo de generador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sin datos para este período</p>
            ) : (
              <div className="space-y-3">
                {typeData.map((item, i) => {
                  const maxTokens = Math.max(...typeData.map(d => d.tokens));
                  const pct = maxTokens > 0 ? (item.tokens / maxTokens) * 100 : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.calls} calls</span>
                          <span className="font-semibold text-foreground">
                            {item.tokens >= 1000 ? `${(item.tokens / 1000).toFixed(1)}k` : item.tokens}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By model */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" /> Consumo por modelo
          </CardTitle>
          <CardDescription>Tokens consumidos por Gemini Pro, Flash y otros modelos</CardDescription>
        </CardHeader>
        <CardContent>
          {modelData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay registros de uso aún. El historial aparecerá cuando generes contenido con IA.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modelData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.calls} llamadas</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {item.tokens >= 1000 ? `${(item.tokens / 1000).toFixed(1)}k` : item.tokens}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {records.slice(0, 50).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] px-2">
                      {generatorLabels[r.generator_type]?.label || r.generator_type}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {(() => { try { return format(new Date(r.created_at), "d MMM, HH:mm", { locale: es }); } catch { return r.created_at; } })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span title="Tokens entrada">↑ {r.tokens_input}</span>
                    <span title="Tokens salida">↓ {r.tokens_output}</span>
                    <span className="hidden md:inline truncate max-w-[120px]" title={r.model}>
                      {r.model.split("/").pop()}
                    </span>
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

export default TokenUsageDashboard;
