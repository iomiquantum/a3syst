import { BarChart3, Bot, Zap, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAIAgentUsage } from "@/hooks/useAIAgentUsage";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const AIUsageHistory = () => {
  const { records, summary, loading } = useAIAgentUsage();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), "d MMM, HH:mm", { locale: es });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{summary.totalCalls}</p>
              <p className="text-[11px] text-muted-foreground">Total llamadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{summary.last30DaysCalls}</p>
              <p className="text-[11px] text-muted-foreground">Últimos 30 días</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{summary.autoCalls}</p>
              <p className="text-[11px] text-muted-foreground">Automáticas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {((summary.totalTokensInput + summary.totalTokensOutput) / 1000).toFixed(1)}k
              </p>
              <p className="text-[11px] text-muted-foreground">Tokens usados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage log table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Historial de uso
          </CardTitle>
          <CardDescription>Últimas {records.length} invocaciones del agente IA</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay registros de uso aún. El historial aparecerá cuando el agente responda mensajes.
            </p>
          ) : (
            <ScrollArea className="max-h-[360px]">
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={r.triggered_by === "auto" ? "default" : "outline"}
                        className="text-[10px] px-2"
                      >
                        {r.triggered_by === "auto" ? "Auto" : "Manual"}
                      </Badge>
                      <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIUsageHistory;
