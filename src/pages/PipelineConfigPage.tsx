import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowRight, Clock, MessageSquare, Ban, UserCheck } from "lucide-react";
import { usePipelineRules, type AutoMessage } from "@/hooks/usePipelineRules";
import { cn } from "@/lib/utils";

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

const DEFAULT_TEMPLATES = [
  "¡Hola {{nombre}}! 👋 Vi que estabas interesado/a en nuestros servicios. ¿Te puedo ayudar con algo?",
  "Hola {{nombre}}, quería saber si aún tienes interés en lo que conversamos. Estamos aquí para ayudarte 😊",
  "{{nombre}}, última oportunidad 🔔 Tenemos disponibilidad limitada. ¿Te gustaría agendar?",
];

const PipelineConfigPage = () => {
  const {
    globalRules, clinicOverrides, effectiveRules, autoMessages,
    loading, saveClinicOverride, removeClinicOverride, saveAutoMessage,
  } = usePipelineRules();

  const [overrideToggles, setOverrideToggles] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [localMessages, setLocalMessages] = useState<{ contact_number: number; message_template: string; is_active: boolean }[]>([]);

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

  useEffect(() => {
    if (autoMessages.length > 0) {
      setLocalMessages(autoMessages.map(m => ({
        contact_number: m.contact_number,
        message_template: m.message_template,
        is_active: m.is_active,
      })));
    } else {
      setLocalMessages([1, 2, 3].map((n, i) => ({
        contact_number: n,
        message_template: DEFAULT_TEMPLATES[i],
        is_active: true,
      })));
    }
  }, [autoMessages]);

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

  const handleSaveMessages = async () => {
    for (const msg of localMessages) {
      await saveAutoMessage(msg.contact_number, msg.message_template, msg.is_active);
    }
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  const S_STEPS = [
    { key: "s1", label: "S1", type: "auto" },
    { key: "s2", label: "S2", type: "auto" },
    { key: "s3", label: "S3", type: "auto" },
    { key: "s4", label: "S4", type: "auto" },
    { key: "s5", label: "S5", type: "auto" },
    { key: "s6", label: "S6", type: "auto" },
    { key: "s7", label: "S7", type: "auto" },
    { key: "s8", label: "S8", type: "auto" },
    { key: "s9", label: "S9", type: "manual" },
    { key: "s10", label: "S10", type: "manual" },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de mensajes</h1>
          <p className="text-sm text-muted-foreground mt-1">Personaliza los tiempos y mensajes de seguimiento automático para tu negocio</p>
        </div>

        {/* Section 1: Timing Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tiempos de seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {RULE_KEYS.map(r => {
              const isCustom = overrideToggles[r.key];
              const globalVal = globalRules[r.key as keyof typeof globalRules];
              const unit = r.key.includes("minutes") ? "minutes" : r.key.includes("hour") ? "hour" : "count";

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
                      {unit === "minutes" ? (localValues[r.key] >= 60 ? "horas" : "minutos") : unit === "hour" ? "h" : ""}
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

        {/* Section 2: Auto Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mensajes de seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {localMessages.map((msg, idx) => {
              const delayKey = `s${msg.contact_number}_delay_minutes` as keyof typeof effectiveRules;
              const delay = effectiveRules[delayKey] || 60;

              return (
                <div key={msg.contact_number} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">S{msg.contact_number}</span>
                      <Badge variant="outline" className="text-xs">{formatMinutes(delay)} después</Badge>
                      <Badge className="bg-blue-500/20 text-blue-600 text-[10px]">Automático (IA)</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{msg.is_active ? "Activo" : "Inactivo"}</span>
                      <Switch
                        checked={msg.is_active}
                        onCheckedChange={v => {
                          setLocalMessages(prev => prev.map((m, i) => i === idx ? { ...m, is_active: v } : m));
                        }}
                      />
                    </div>
                  </div>
                  <Textarea
                    value={msg.message_template}
                    onChange={e => {
                      setLocalMessages(prev => prev.map((m, i) => i === idx ? { ...m, message_template: e.target.value } : m));
                    }}
                    rows={2}
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">Usa <code className="bg-muted px-1 rounded">{"{{nombre}}"}</code> para el nombre del cliente</p>
                  {msg.message_template.includes("{{nombre}}") && (
                    <div className="bg-muted rounded-lg px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Preview:</span>{" "}
                      {msg.message_template.replace(/\{\{nombre\}\}/g, "María")}
                    </div>
                  )}
                </div>
              );
            })}
            <Button onClick={handleSaveMessages}>
              <Save className="w-4 h-4 mr-1.5" />Guardar mensajes
            </Button>
          </CardContent>
        </Card>

        {/* Section 3: Flow Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista previa del flujo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg px-3 py-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">IA responde</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">{formatMinutes(effectiveRules.inactivity_timeout_minutes)}</Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />

              {S_STEPS.map((s, i) => {
                const delayKey = `${s.key}_delay_minutes` as keyof typeof effectiveRules;
                const delay = effectiveRules[delayKey];
                return (
                  <div key={s.key} className="contents">
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2",
                      s.type === "auto" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {s.type === "auto" ? <Clock className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      <span>{s.label}</span>
                    </div>
                    {i < S_STEPS.length - 1 && (
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
              S1-S8 son automáticos (IA). S9-S10 son manuales (agente humano). Si el cliente responde, avanza al siguiente S sin retroceder.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PipelineConfigPage;
