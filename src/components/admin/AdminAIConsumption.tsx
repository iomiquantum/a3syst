import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, DollarSign, Bot, Zap, TrendingUp, Calendar, Download, ChevronDown, ChevronRight,
  MessageSquare, RefreshCw, CalendarCheck, Palette, Building, Video, Brain, Clock, Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ========= TYPES =========
interface RawRecord {
  clinic_id: string;
  generator_type: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  action_label: string;
  created_at: string;
}

interface Props { clinics: any[]; }

// ========= SECTION MAPPING =========
const SECTION_MAP: Record<string, { section: string; label: string }> = {
  agent:              { section: "messaging", label: "Respuestas automáticas" },
  agent_disposition:  { section: "messaging", label: "Análisis de disposición" },
  agent_extraction:   { section: "messaging", label: "Extracción datos contacto" },
  voice_transcription:{ section: "messaging", label: "Transcripción de voz" },
  pipeline_summary:   { section: "pipeline", label: "Resumen ejecutivo escalación" },
  appointment_flow:   { section: "appointments", label: "Flujo de citas IA" },
  copy:               { section: "content", label: "Generación de copy" },
  image:              { section: "content", label: "Generación de imágenes" },
  onboarding:         { section: "setup", label: "Onboarding conversacional" },
  personalize:        { section: "setup", label: "Personalización de negocio" },
  brand_analysis:     { section: "setup", label: "Análisis de marca" },
  meeting_summary:    { section: "meetings", label: "Resumen de reunión" },
};

const SECTIONS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "messaging", label: "Mensajería / Agente IA", icon: <MessageSquare className="w-4 h-4" />, color: "hsl(var(--primary))" },
  { key: "pipeline", label: "Pipeline / Seguimientos", icon: <RefreshCw className="w-4 h-4" />, color: "hsl(var(--accent))" },
  { key: "appointments", label: "Flujo de Citas", icon: <CalendarCheck className="w-4 h-4" />, color: "#10b981" },
  { key: "content", label: "Contenido", icon: <Palette className="w-4 h-4" />, color: "#f59e0b" },
  { key: "setup", label: "Configuración / Setup", icon: <Building className="w-4 h-4" />, color: "#8b5cf6" },
  { key: "meetings", label: "Reuniones", icon: <Video className="w-4 h-4" />, color: "#ec4899" },
];

function getSectionKey(generatorType: string, actionLabel: string): string {
  // Seguimientos are agent calls with specific labels
  if (generatorType === "agent" && /seguimiento/i.test(actionLabel)) return "pipeline";
  return SECTION_MAP[generatorType]?.section || "messaging";
}

function getTypeLabel(generatorType: string): string {
  return SECTION_MAP[generatorType]?.label || generatorType;
}

// ROI config
const HUMAN_COST_PER_HOUR = 8; // USD
const MINUTES_PER_TYPE: Record<string, number> = {
  agent: 3, agent_disposition: 2, agent_extraction: 1, voice_transcription: 2,
  pipeline_summary: 10, appointment_flow: 5, copy: 15, image: 20,
  onboarding: 10, personalize: 5, brand_analysis: 15, meeting_summary: 30,
};

// ========= COMPONENT =========
const AdminAIConsumption = ({ clinics }: Props) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [period, setPeriod] = useState<"month" | "30d" | "7d">("month");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["messaging"]));
  const [expandedClinics, setExpandedClinics] = useState<Set<string>>(new Set());

  const getPeriodStart = () => {
    if (period === "7d") return subDays(new Date(), 7).toISOString();
    if (period === "30d") return subDays(new Date(), 30).toISOString();
    return startOfMonth(new Date()).toISOString();
  };

  useEffect(() => { fetchAllRecords(); }, [period]);

  const fetchAllRecords = async () => {
    setLoading(true);
    const since = getPeriodStart();
    let all: RawRecord[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("ai_token_usage")
        .select("clinic_id, generator_type, model, tokens_input, tokens_output, cost_usd, action_label, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);
      const batch = (data || []) as RawRecord[];
      all = all.concat(batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }
    setRecords(all);
    setLoading(false);
  };

  const clinicMap = useMemo(() => {
    const m = new Map<string, any>();
    clinics.forEach(c => m.set(c.id, c));
    return m;
  }, [clinics]);

  // ========= AGGREGATIONS =========
  const { totalCost, totalCalls, totalTokens, sectionData, modelData, clinicData, dailyChart, roiData } = useMemo(() => {
    let tCost = 0, tCalls = 0, tTokens = 0;
    const sections: Record<string, { calls: number; cost: number; tokensIn: number; tokensOut: number; types: Record<string, { calls: number; cost: number; tokensIn: number; tokensOut: number }> }> = {};
    const models: Record<string, { calls: number; cost: number; tokensIn: number; tokensOut: number }> = {};
    const clinicAgg: Record<string, { calls: number; cost: number; tokensIn: number; tokensOut: number; sections: Record<string, { calls: number; cost: number }> }> = {};
    const dailyAgg: Record<string, Record<string, number>> = {};
    let totalMinutesSaved = 0;

    records.forEach(r => {
      const cost = Number(r.cost_usd) || 0;
      tCost += cost;
      tCalls++;
      tTokens += (r.tokens_input || 0) + (r.tokens_output || 0);

      const secKey = getSectionKey(r.generator_type, r.action_label);
      if (!sections[secKey]) sections[secKey] = { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0, types: {} };
      sections[secKey].calls++;
      sections[secKey].cost += cost;
      sections[secKey].tokensIn += r.tokens_input || 0;
      sections[secKey].tokensOut += r.tokens_output || 0;

      const typeLabel = r.generator_type;
      if (!sections[secKey].types[typeLabel]) sections[secKey].types[typeLabel] = { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0 };
      sections[secKey].types[typeLabel].calls++;
      sections[secKey].types[typeLabel].cost += cost;
      sections[secKey].types[typeLabel].tokensIn += r.tokens_input || 0;
      sections[secKey].types[typeLabel].tokensOut += r.tokens_output || 0;

      const modelKey = r.model?.split("/").pop() || r.model || "unknown";
      if (!models[modelKey]) models[modelKey] = { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0 };
      models[modelKey].calls++;
      models[modelKey].cost += cost;
      models[modelKey].tokensIn += r.tokens_input || 0;
      models[modelKey].tokensOut += r.tokens_output || 0;

      if (!clinicAgg[r.clinic_id]) clinicAgg[r.clinic_id] = { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0, sections: {} };
      clinicAgg[r.clinic_id].calls++;
      clinicAgg[r.clinic_id].cost += cost;
      clinicAgg[r.clinic_id].tokensIn += r.tokens_input || 0;
      clinicAgg[r.clinic_id].tokensOut += r.tokens_output || 0;
      if (!clinicAgg[r.clinic_id].sections[secKey]) clinicAgg[r.clinic_id].sections[secKey] = { calls: 0, cost: 0 };
      clinicAgg[r.clinic_id].sections[secKey].calls++;
      clinicAgg[r.clinic_id].sections[secKey].cost += cost;

      const day = r.created_at?.substring(0, 10) || "unknown";
      if (!dailyAgg[day]) dailyAgg[day] = {};
      dailyAgg[day][secKey] = (dailyAgg[day][secKey] || 0) + cost;

      totalMinutesSaved += MINUTES_PER_TYPE[r.generator_type] || 3;
    });

    const humanCostSaved = (totalMinutesSaved / 60) * HUMAN_COST_PER_HOUR;

    const dailyChartData = Object.entries(dailyAgg)
      .map(([day, secs]) => ({ day, ...secs }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const clinicDataArr = Object.entries(clinicAgg)
      .map(([id, data]) => ({
        id,
        name: clinicMap.get(id)?.name || "Desconocido",
        budget: clinicMap.get(id)?.monthly_token_budget_usd ?? null,
        ...data,
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      totalCost: tCost, totalCalls: tCalls, totalTokens: tTokens,
      sectionData: sections, modelData: models, clinicData: clinicDataArr,
      dailyChart: dailyChartData,
      roiData: { minutesSaved: totalMinutesSaved, humanCost: humanCostSaved, aiCost: tCost },
    };
  }, [records, clinicMap]);

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  const toggleClinic = (id: string) => {
    const next = new Set(expandedClinics);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedClinics(next);
  };

  const exportCSV = () => {
    const headers = ["Fecha","Negocio","Sección","Tipo","Modelo","Tokens In","Tokens Out","Costo USD","Descripción"];
    const rows = records.map(r => [
      r.created_at?.substring(0, 19).replace("T", " "),
      clinicMap.get(r.clinic_id)?.name || r.clinic_id,
      SECTIONS.find(s => s.key === getSectionKey(r.generator_type, r.action_label))?.label || "",
      getTypeLabel(r.generator_type),
      r.model?.split("/").pop() || r.model,
      r.tokens_input, r.tokens_output, r.cost_usd?.toFixed(6),
      r.action_label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `consumo-ia-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: <DollarSign className="w-4 h-4 text-primary" />, value: `$${totalCost.toFixed(4)}`, label: "Costo total USD" },
          { icon: <BarChart3 className="w-4 h-4 text-accent" />, value: totalCalls.toLocaleString(), label: "Llamadas IA" },
          { icon: <Zap className="w-4 h-4 text-yellow-500" />, value: `${(totalTokens / 1000).toFixed(1)}k`, label: "Tokens totales" },
          { icon: <Bot className="w-4 h-4 text-primary" />, value: clinicData.length.toString(), label: "Negocios activos" },
          { icon: <Clock className="w-4 h-4 text-green-500" />, value: `${(roiData.minutesSaved / 60).toFixed(1)}h`, label: "Tiempo ahorrado" },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">{kpi.icon}</div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROI Card */}
      <Card className="shadow-card border-green-500/20 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-foreground">ROI estimado</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">${roiData.humanCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Costo humano equivalente ({(roiData.minutesSaved / 60).toFixed(1)}h × ${HUMAN_COST_PER_HOUR}/h)</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">${roiData.aiCost.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Costo IA real</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {roiData.aiCost > 0 ? `${(roiData.humanCost / roiData.aiCost).toFixed(0)}x` : "∞"}
              </p>
              <p className="text-xs text-muted-foreground">Ahorro multiplicador</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Consumo por sección del sistema
          </CardTitle>
          <CardDescription>Desglose detallado por módulo, tipo de llamada y costo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {SECTIONS.map(sec => {
            const data = sectionData[sec.key];
            if (!data) return null;
            const isOpen = expandedSections.has(sec.key);
            const pct = totalCost > 0 ? (data.cost / totalCost * 100) : 0;
            return (
              <Collapsible key={sec.key} open={isOpen} onOpenChange={() => toggleSection(sec.key)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: sec.color + "20", color: sec.color }}>
                        {sec.icon}
                      </div>
                      <span className="font-medium text-sm text-foreground">{sec.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{data.calls.toLocaleString()} llamadas</span>
                      <span className="font-semibold text-sm text-foreground">${data.cost.toFixed(4)}</span>
                      <Badge variant="outline" className="text-[10px] min-w-[45px] justify-center">{pct.toFixed(1)}%</Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-10 mt-1 mb-2 space-y-1">
                    {Object.entries(data.types).sort((a, b) => b[1].cost - a[1].cost).map(([type, td]) => (
                      <div key={type} className="flex items-center justify-between py-1.5 px-3 text-sm rounded border border-border/40 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sec.color }} />
                          <span className="text-muted-foreground">{getTypeLabel(type)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">{td.calls} calls</span>
                          <span className="text-muted-foreground">↑{(td.tokensIn / 1000).toFixed(1)}k ↓{(td.tokensOut / 1000).toFixed(1)}k</span>
                          <span className="font-medium text-foreground">${td.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Model Breakdown */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Consumo por modelo LLM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Llamadas</TableHead>
                <TableHead className="text-right">Tokens In</TableHead>
                <TableHead className="text-right">Tokens Out</TableHead>
                <TableHead className="text-right">Costo USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(modelData).sort((a, b) => b[1].cost - a[1].cost).map(([model, md]) => (
                <TableRow key={model}>
                  <TableCell className="font-medium">{model}</TableCell>
                  <TableCell className="text-right">{md.calls.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(md.tokensIn / 1000).toFixed(1)}k</TableCell>
                  <TableCell className="text-right">{(md.tokensOut / 1000).toFixed(1)}k</TableCell>
                  <TableCell className="text-right font-semibold">${md.cost.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-clinic with expandable section detail */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Consumo por negocio
          </CardTitle>
          <CardDescription>Click en un negocio para ver desglose por sección</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-1">
              {clinicData.map(cd => {
                const budgetPct = cd.budget ? (cd.cost / cd.budget) * 100 : null;
                const isOpen = expandedClinics.has(cd.id);
                return (
                  <Collapsible key={cd.id} open={isOpen} onOpenChange={() => toggleClinic(cd.id)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-medium text-foreground text-left">{cd.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>{cd.calls} llamadas</span>
                              <span>↑{(cd.tokensIn / 1000).toFixed(1)}k ↓{(cd.tokensOut / 1000).toFixed(1)}k</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">${cd.cost.toFixed(4)}</p>
                            {cd.budget !== null && <p className="text-[10px] text-muted-foreground">de ${cd.budget.toFixed(2)}</p>}
                          </div>
                          {budgetPct !== null ? (
                            <Badge variant={budgetPct >= 100 ? "destructive" : budgetPct >= 80 ? "secondary" : "outline"} className="text-[10px] min-w-[50px] justify-center">
                              {budgetPct.toFixed(0)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Open</Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 mb-2 space-y-1">
                        {SECTIONS.map(sec => {
                          const secData = cd.sections[sec.key];
                          if (!secData) return null;
                          return (
                            <div key={sec.key} className="flex items-center justify-between py-1.5 px-3 text-sm rounded border border-border/40 bg-muted/30">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ color: sec.color }}>{sec.icon}</div>
                                <span className="text-muted-foreground text-xs">{sec.label}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">{secData.calls} calls</span>
                                <span className="font-medium text-foreground">${secData.cost.toFixed(4)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Daily trend chart */}
      {dailyChart.length > 1 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Tendencia diaria por sección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyChart}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={v => v.substring(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Number(v).toFixed(3)}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(5)}`} labelFormatter={l => `Día: ${l}`} />
                <Legend />
                {SECTIONS.map(sec => (
                  <Bar key={sec.key} dataKey={sec.key} name={sec.label} stackId="a" fill={sec.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAIConsumption;
