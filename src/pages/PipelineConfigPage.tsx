import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowRight, Clock, MessageSquare, Ban, UserCheck, Brain, Shield, Lightbulb } from "lucide-react";
import { usePipelineRules } from "@/hooks/usePipelineRules";
import { useSeguimientoStrategies } from "@/hooks/useSeguimientoStrategies";
import { useAgentName } from "@/hooks/useAgentName";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

const RULE_KEYS = [
  { key: "inactivity_timeout_minutes", label: "Tiempo de inactividad", desc: "Tiempo sin respuesta del cliente antes de iniciar seguimiento" },
  { key: "s1_delay_minutes", label: "Delay S1", desc: "Tiempo para enviar primer seguimiento automático" },
  { key: "s2_delay_minutes", label: "Delay S2", desc: "Tiempo para enviar segundo seguimiento" },
  { key: "s3_delay_minutes", label: "Delay S3", desc: "Tiempo para enviar tercer seguimiento" },
  { key: "s4_delay_minutes", label: "Delay S4", desc: "Tiempo para enviar cuarto seguimiento" },
  { key: "s5_delay_minutes", label: "Delay S5", desc: "Tiempo para enviar quinto seguimiento" },
  { key: "s6_delay_minutes", label: "Delay S6", desc: "Tiempo para enviar sexto seguimiento" },
  { key: "s7_delay_minutes", label: "Delay S7", desc: "Tiempo para enviar séptimo seguimiento" },
  { key: "s8_delay_minutes", label: "Delay S8", desc: "Tiempo para enviar octavo seguimiento (último IA)" },
  { key: "max_auto_contacts", label: "Contactos máximos", desc: "Intentos antes de mover a 'No responden'" },
  { key: "send_window_start_hour", label: "Hora inicio envío", desc: "Hora desde la que se envían mensajes" },
  { key: "send_window_end_hour", label: "Hora fin envío", desc: "Hora hasta la que se envían mensajes" },
] as const;

function formatMinutes(min: number): string {
  if (min >= 1440) return `${Math.round(min / 1440)} día(s)`;
  if (min >= 60) return `${Math.round(min / 60)} hora(s)`;
  return `${min} min`;
}

const PipelineConfigPage = () => {
  const { clinicId } = useClinic();
  const {
    globalRules, clinicOverrides, effectiveRules,
    loading, saveClinicOverride, removeClinicOverride,
  } = usePipelineRules();
  const { strategies } = useSeguimientoStrategies();
  const { agentName } = useAgentName();

  const [overrideToggles, setOverrideToggles] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [localAgentName, setLocalAgentName] = useState("");
  const [humanDelayEnabled, setHumanDelayEnabled] = useState(true);

  useEffect(() => {
    setLocalAgentName(agentName);
  }, [agentName]);

  useEffect(() => {
    const toggles: Record<string, boolean> = {};
    const vals: Record<string, number> = {};
    RULE_KEYS.forEach(r => {
      const hasOverride = clinicOverrides[r.key as keyof typeof clinicOverrides] !== undefined;
      toggles[r.key] = hasOverride;
      vals[r.key] = hasOverride ? (clinicOverrides[r.key as keyof typeof clinicOverrides] as number) : globalRules[r.key as keyof typeof globalRules];
    });
    setOverrideToggles(toggles);
    setLocalValues(vals);
  }, [globalRules, clinicOverrides]);

  const handleToggleOverride = async (key: string, useGlobal: boolean) => {
    setOverrideToggles(prev => ({ ...prev, [key]: !useGlobal }));
    if (useGlobal) {
      await removeClinicOverride(key);
      setLocalValues(prev => ({ ...prev, [key]: globalRules[key as keyof typeof globalRules] }));
    }
  };

  const handleSaveOverride = async (key: string) => {
    await saveClinicOverride(key, localValues[key]);
  };

  const handleSaveAgentName = async () => {
    if (!clinicId) return;
    await supabase.from("clinic_pipeline_rules").upsert({
      clinic_id: clinicId,
      rule_key: "ai_agent_name",
      rule_value: JSON.stringify(localAgentName) as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id,rule_key" });
    toast.success("Nombre del agente actualizado");
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de mensajes</h1>
          <p className="text-sm text-muted-foreground mt-1">Personaliza los tiempos, estrategias y comportamiento del seguimiento automático</p>
        </div>

        {/* Agent Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nombre del agente IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                value={localAgentName}
                onChange={e => setLocalAgentName(e.target.value)}
                className="w-48"
                placeholder="Sofía"
              />
              <Button size="sm" variant="outline" onClick={handleSaveAgentName}>
                <Save className="w-3 h-3 mr-1" />Guardar
              </Button>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Preview: "Hola María, soy <strong className="text-foreground">{localAgentName}</strong> de tu negocio..."
            </div>
          </CardContent>
        </Card>

        {/* Send Window + Delay */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horarios y delay humanizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Hora inicio envío</Label>
                <Input
                  type="number" min={0} max={23}
                  value={localValues["send_window_start_hour"] ?? 7}
                  onChange={e => setLocalValues(prev => ({ ...prev, send_window_start_hour: parseInt(e.target.value) || 7 }))}
                  className="w-24"
                />
                <p className="text-[10px] text-muted-foreground">AM (0-23)</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Hora fin envío</Label>
                <Input
                  type="number" min={0} max={23}
                  value={localValues["send_window_end_hour"] ?? 23}
                  onChange={e => setLocalValues(prev => ({ ...prev, send_window_end_hour: parseInt(e.target.value) || 23 }))}
                  className="w-24"
                />
                <p className="text-[10px] text-muted-foreground">PM (0-23)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Los mensajes fuera de esta ventana se posponen automáticamente</p>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Delay humanizado</Label>
                  <p className="text-xs text-muted-foreground">Las respuestas tardarán entre 5 y 45 segundos simulando escritura humana</p>
                </div>
                <Switch checked={humanDelayEnabled} onCheckedChange={setHumanDelayEnabled} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tiempos de seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {RULE_KEYS.filter(r => !r.key.includes("hour")).map(r => {
              const isCustom = overrideToggles[r.key];
              const globalVal = globalRules[r.key as keyof typeof globalRules];
              const unit = r.key.includes("minutes") ? "minutes" : "count";

              return (
                <div key={r.key} className="space-y-2 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">{r.label}</Label>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{isCustom ? "Personalizado" : "Default global"}</span>
                      <Switch checked={isCustom} onCheckedChange={v => handleToggleOverride(r.key, !v)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={unit === "minutes" && localValues[r.key] >= 60 ? Math.round(localValues[r.key] / 60) : localValues[r.key]}
                      onChange={e => {
                        const raw = parseInt(e.target.value) || 0;
                        setLocalValues(prev => ({
                          ...prev,
                          [r.key]: unit === "minutes" && localValues[r.key] >= 60 ? raw * 60 : raw,
                        }));
                      }}
                      disabled={!isCustom}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      {unit === "minutes" ? (localValues[r.key] >= 60 ? "horas" : "minutos") : ""}
                    </span>
                    {!isCustom && (
                      <Badge variant="outline" className="text-xs">
                        Default: {unit === "minutes" ? formatMinutes(globalVal) : globalVal}
                      </Badge>
                    )}
                    {isCustom && (
                      <Button size="sm" variant="outline" onClick={() => handleSaveOverride(r.key)}>
                        <Save className="w-3 h-3 mr-1" />Guardar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Strategies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Los 10 seguimientos — Estrategias psicológicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strategies.map(s => {
              const delayKey = `s${s.contact_number}_delay_minutes` as keyof typeof effectiveRules;
              const delay = effectiveRules[delayKey];
              const isManual = s.contact_number >= 9;

              return (
                <div key={s.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">S{s.contact_number}</span>
                      <span className="text-sm font-medium text-foreground">— {s.strategy_name}</span>
                      {delay && (
                        <Badge variant="outline" className="text-[10px]">+{formatMinutes(delay)}</Badge>
                      )}
                      <Badge className={cn(
                        "text-[10px]",
                        isManual
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-blue-500/20 text-blue-600"
                      )}>
                        {isManual ? "Manual ✋" : "Automático IA"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.strategy_description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div className="flex items-start gap-1.5 bg-muted/50 rounded px-2 py-1.5">
                      <Brain className="w-3 h-3 text-violet-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">Principio:</span>{" "}
                        <span className="text-muted-foreground">{s.psychological_principle}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 bg-muted/50 rounded px-2 py-1.5">
                      <Shield className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">Barrera:</span>{" "}
                        <span className="text-muted-foreground">{s.barrier_it_solves}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 bg-muted/50 rounded px-2 py-1.5">
                      <Lightbulb className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">Reglas:</span>{" "}
                        <span className="text-muted-foreground">{s.rules}</span>
                      </div>
                    </div>
                  </div>
                  {isManual && (
                    <p className="text-[10px] text-amber-600 italic">
                      Este contacto lo envía un agente humano. S9: se presenta como compañero de {localAgentName}. S10: cierre con valor.
                    </p>
                  )}
                  {!isManual && (
                    <p className="text-[10px] text-muted-foreground italic">
                      El mensaje se genera por IA basándose en el contexto del chat y esta estrategia.
                    </p>
                  )}
                </div>
              );
            })}
            {strategies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando estrategias...</p>
            )}
          </CardContent>
        </Card>

        {/* Flow Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista previa del flujo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg px-3 py-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{localAgentName} responde</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">{formatMinutes(effectiveRules.inactivity_timeout_minutes)}</Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />

              {Array.from({ length: 10 }, (_, i) => i + 1).map((n, i) => {
                const isManual = n >= 9;
                const delayKey = `s${n}_delay_minutes` as keyof typeof effectiveRules;
                const delay = effectiveRules[delayKey];
                const strategy = strategies.find(s => s.contact_number === n);
                return (
                  <div key={n} className="contents">
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2",
                      isManual ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                    )} title={strategy?.strategy_name}>
                      {isManual ? <UserCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span>S{n}</span>
                    </div>
                    {i < 9 && (
                      <>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        {delay && <Badge variant="outline" className="text-xs">{formatMinutes(delay)}</Badge>}
                        {delay && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                      </>
                    )}
                  </div>
                );
              })}

              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-600 rounded-lg px-3 py-2">
                <Ban className="w-4 h-4" />
                <span>No responden</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              S1-S8 son automáticos (IA como {localAgentName}). S9-S10 son manuales (agente humano). Si el cliente responde, avanza al siguiente S sin retroceder.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PipelineConfigPage;
