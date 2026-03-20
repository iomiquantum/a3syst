import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Monitor, Save, RotateCcw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RuleField {
  key: string;
  label: string;
  description: string;
  default: number;
  unit: "minutes" | "count";
  min?: number;
  max?: number;
}

const RULE_FIELDS: RuleField[] = [
  { key: "inactivity_timeout_minutes", label: "Tiempo de inactividad", description: "Después de que la IA responde, si el cliente no escribe en este tiempo, pasa a S1", default: 15, unit: "minutes" },
  { key: "s1_delay_minutes", label: "Delay S1", description: "Tiempo para enviar primer seguimiento automático", default: 15, unit: "minutes" },
  { key: "s2_delay_minutes", label: "Delay S2", description: "Tiempo después de S1 sin respuesta", default: 30, unit: "minutes" },
  { key: "s3_delay_minutes", label: "Delay S3", description: "Tiempo después de S2 sin respuesta", default: 30, unit: "minutes" },
  { key: "s4_delay_minutes", label: "Delay S4", description: "Tiempo después de S3 sin respuesta", default: 60, unit: "minutes" },
  { key: "s5_delay_minutes", label: "Delay S5", description: "Tiempo después de S4 sin respuesta", default: 120, unit: "minutes" },
  { key: "s6_delay_minutes", label: "Delay S6", description: "Tiempo después de S5 sin respuesta", default: 240, unit: "minutes" },
  { key: "s7_delay_minutes", label: "Delay S7", description: "Tiempo después de S6 sin respuesta", default: 720, unit: "minutes" },
  { key: "s8_delay_minutes", label: "Delay S8", description: "Último seguimiento automático IA", default: 30, unit: "minutes" },
  { key: "max_auto_contacts", label: "Contactos automáticos máximos", description: "Después de este número sin respuesta, se mueve a 'No responden'", default: 10, unit: "count", min: 1, max: 10 },
  { key: "recurrente_max_cycles", label: "Ciclos recurrentes máximos", description: "Cuántas veces un contacto puede reingresar al seguimiento. 0 = sin límite", default: 0, unit: "count", min: 0 },
];

const PIPELINE_STATES = [
  { state: "Resueltos IA", desc: "La IA respondió y el timer de inactividad está corriendo", movedBy: "Sistema (automático)", goesTo: "Seguimiento S1" },
  { state: "Seguimiento S1-S8", desc: "Seguimiento automático con estrategias psicológicas (IA)", movedBy: "Sistema (timer)", goesTo: "Siguiente S o No responden" },
  { state: "Seguimiento S9-S10", desc: "Seguimiento manual por agente humano", movedBy: "Agente humano", goesTo: "Agendados o Perdidos" },
  { state: "No responden", desc: "Sin respuesta después de todos los contactos", movedBy: "Sistema", goesTo: "Resueltos IA (si responde)" },
  { state: "Agendados", desc: "Cita programada con recordatorios automáticos", movedBy: "Operador manual", goesTo: "Show/No-show" },
  { state: "No-show", desc: "No asistió a la cita, reinicia seguimiento", movedBy: "Operador manual", goesTo: "Seguimiento S1 (recurrente)" },
  { state: "Show sin venta", desc: "Asistió pero no compró", movedBy: "Operador manual", goesTo: "Reconversión" },
  { state: "No interesado", desc: "Marcado manualmente como no interesado", movedBy: "Operador manual", goesTo: "Terminal" },
  { state: "Escalados", desc: "Requiere atención especial", movedBy: "Operador manual", goesTo: "Terminal" },
  { state: "Pacientes", desc: "Convertido a paciente/cliente", movedBy: "Operador manual", goesTo: "Terminal" },
  { state: "Perdidos", desc: "Perdido, opción de reingreso", movedBy: "Operador manual", goesTo: "Resueltos IA (reingreso)" },
];

function formatMinutes(min: number): string {
  if (min >= 1440) return `${Math.round(min / 1440)}d`;
  if (min >= 60) return `${Math.round(min / 60)}h`;
  return `${min}min`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const AdminPipelinePage = () => {
  const [rules, setRules] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultMessages, setDefaultMessages] = useState<{ contact_number: number; message_template: string; is_active: boolean }[]>([]);
  const [lockStatus, setLockStatus] = useState<{ is_running: boolean; last_completed_at: string | null }>({ is_running: false, last_completed_at: null });
  const [execLogs, setExecLogs] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});

  const fetchAll = async () => {
    setLoading(true);

    const [rulesRes, lockRes, logsRes, countsRes] = await Promise.all([
      supabase.from("pipeline_global_rules").select("rule_key, rule_value"),
      supabase.from("pipeline_execution_lock").select("*").eq("id", 1).single(),
      (supabase as any).from("pipeline_execution_log").select("*").order("executed_at", { ascending: false }).limit(20),
      supabase.from("conversations").select("pipeline_tab").not("pipeline_tab", "is", null),
    ]);

    const r: Record<string, number> = {};
    (rulesRes.data || []).forEach((row: any) => { r[row.rule_key] = Number(row.rule_value) || 0; });
    setRules(r);

    if (lockRes.data) setLockStatus(lockRes.data as any);
    setExecLogs(logsRes.data || []);

    const counts: Record<string, number> = {};
    (countsRes.data || []).forEach((c: any) => {
      counts[c.pipeline_tab] = (counts[c.pipeline_tab] || 0) + 1;
    });
    setPipelineCounts(counts);

    // Fetch default messages (using a known admin clinic or null clinic approach)
    // For global defaults, we check seguimiento_auto_messages with no specific clinic filter
    // Actually global defaults are just the templates — we'll show a simple editor

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveRules = async () => {
    setSaving(true);
    for (const field of RULE_FIELDS) {
      const val = rules[field.key] ?? field.default;
      await supabase.from("pipeline_global_rules")
        .upsert({ rule_key: field.key, rule_value: val as any, updated_at: new Date().toISOString() }, { onConflict: "rule_key" });
    }
    toast.success("Reglas globales guardadas");
    setSaving(false);
  };

  const handleResetDefaults = () => {
    const reset: Record<string, number> = {};
    RULE_FIELDS.forEach(f => { reset[f.key] = f.default; });
    setRules(reset);
    toast.info("Valores restaurados a defaults (guarda para aplicar)");
  };

  const updateRule = (key: string, value: number) => {
    setRules(prev => ({ ...prev, [key]: value }));
  };

  const RuleInput = ({ field }: { field: RuleField }) => {
    const value = rules[field.key] ?? field.default;
    const displayValue = field.unit === "minutes" && value >= 60 ? Math.round(value / 60) : value;
    const displayUnit = field.unit === "minutes" && value >= 60 ? "hours" : field.unit === "minutes" ? "minutes" : "count";

    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{field.label}</Label>
        <p className="text-xs text-muted-foreground">{field.description}</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={displayValue}
            onChange={e => {
              const raw = parseInt(e.target.value) || 0;
              updateRule(field.key, displayUnit === "hours" ? raw * 60 : raw);
            }}
            min={field.min || 0}
            max={field.max}
            className="w-24"
          />
          {field.unit === "minutes" && (
            <Select
              value={displayUnit}
              onValueChange={u => {
                if (u === "hours") updateRule(field.key, Math.max(60, value));
                else updateRule(field.key, Math.min(value, 1440));
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutos</SelectItem>
                <SelectItem value="hours">horas</SelectItem>
              </SelectContent>
            </Select>
          )}
          {field.unit === "count" && <span className="text-sm text-muted-foreground">contactos</span>}
        </div>
      </div>
    );
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración del pipeline de mensajes</h1>
          <p className="text-sm text-muted-foreground mt-1">Estas reglas aplican como DEFAULT para todos los negocios. Cada negocio puede tener overrides propios.</p>
        </div>

        <Tabs defaultValue="reglas">
          <TabsList>
            <TabsTrigger value="reglas" className="gap-1.5"><Settings className="w-3.5 h-3.5" />Reglas</TabsTrigger>
            <TabsTrigger value="monitor" className="gap-1.5"><Monitor className="w-3.5 h-3.5" />Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="reglas" className="space-y-6 mt-4">
            {/* Section 1: Timing Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tiempos de automatización</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {RULE_FIELDS.map(f => <RuleInput key={f.key} field={f} />)}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveRules} disabled={saving}>
                    <Save className="w-4 h-4 mr-1.5" />{saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <Button variant="outline" onClick={handleResetDefaults}>
                    <RotateCcw className="w-4 h-4 mr-1.5" />Restaurar defaults
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Pipeline States Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de estados del pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Quién lo mueve</TableHead>
                      <TableHead>A dónde puede ir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PIPELINE_STATES.map(s => (
                      <TableRow key={s.state}>
                        <TableCell className="font-medium text-sm">{s.state}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.desc}</TableCell>
                        <TableCell className="text-xs">{s.movedBy}</TableCell>
                        <TableCell className="text-xs">{s.goesTo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6 mt-4">
            {/* Lock Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado del pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {lockStatus.is_running ? (
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-600"><Clock className="w-3 h-3 mr-1" />Ejecutando...</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Inactivo</Badge>
                  )}
                  {lockStatus.last_completed_at && (
                    <span className="text-sm text-muted-foreground">Última ejecución: {timeAgo(lockStatus.last_completed_at)}</span>
                  )}
                </div>

                {/* Pipeline Counts */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Conversaciones en el pipeline</p>
                  {["resueltos_ia", "seguimiento_s1", "seguimiento_s2", "seguimiento_s3", "seguimiento_s4", "seguimiento_s5", "seguimiento_s6", "seguimiento_s7", "seguimiento_s8", "seguimiento_s9", "seguimiento_s10", "no_responden", "agendados", "no_show", "show_sin_venta", "no_interesado", "escalados", "pacientes", "perdidos"].map(tab => (
                    <div key={tab} className="flex items-center gap-2">
                      <span className="text-xs w-32 text-muted-foreground capitalize">{tab.replace(/_/g, " ")}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", tab === "resueltos_ia" ? "bg-emerald-500" : tab.startsWith("seguimiento") ? "bg-blue-500" : tab === "no_responden" ? "bg-amber-500" : "bg-muted-foreground/40")}
                          style={{ width: `${Math.min(100, (pipelineCounts[tab] || 0) * 5)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{pipelineCounts[tab] || 0}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Execution Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Últimas ejecuciones</CardTitle>
              </CardHeader>
              <CardContent>
                {execLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No hay ejecuciones registradas aún</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>→ Seg.</TableHead>
                        <TableHead>Msgs</TableHead>
                        <TableHead>→ No resp.</TableHead>
                        <TableHead>Fixes</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Errores</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {execLogs.map((log: any) => {
                        const errs = typeof log.errors === "string" ? JSON.parse(log.errors || "[]") : (log.errors || []);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{timeAgo(log.executed_at)}</TableCell>
                            <TableCell className="text-xs font-mono">{log.moved_to_seguimiento || log.moved_to_c1}</TableCell>
                            <TableCell className="text-xs font-mono">{log.messages_sent}</TableCell>
                            <TableCell className="text-xs font-mono">{log.moved_to_no_responden}</TableCell>
                            <TableCell className="text-xs font-mono">{log.inconsistencies_fixed}</TableCell>
                            <TableCell className="text-xs font-mono">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</TableCell>
                            <TableCell>
                              {errs.length > 0 ? (
                                <Badge variant="destructive" className="text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />{errs.length}</Badge>
                              ) : (
                                <span className="text-emerald-500 text-xs">✓</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminPipelinePage;
