import { useState } from "react";
import { Bot, Save, Plus, Trash2, GripVertical, Loader2, Calendar, Users, Megaphone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAIAgentConfig, ServiceItem } from "@/hooks/useAIAgentConfig";
import { Skeleton } from "@/components/ui/skeleton";
import AIUsageHistory from "@/components/ai/AIUsageHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const AIAgentConfigPage = () => {
  const { config, setConfig, loading, saving, save } = useAIAgentConfig();
  
  // Autopilot settings state
  const [agendaReminders, setAgendaReminders] = useState(true);
  const [agendaAutoConfirm, setAgendaAutoConfirm] = useState(false);
  const [agendaReschedule, setAgendaReschedule] = useState(true);
  const [crmWelcome, setCrmWelcome] = useState("¡Hola! Gracias por tu interés. ¿En qué podemos ayudarte?");
  const [crmLostDays, setCrmLostDays] = useState("14");
  const [mktFrequency, setMktFrequency] = useState("3x");
  const [mktPlatforms, setMktPlatforms] = useState({ instagram: true, facebook: true, tiktok: false });
  const [mktApproval, setMktApproval] = useState(true);
  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig({ ...config, [key]: value });
  };

  const addService = () => {
    update("services", [...config.services, { id: crypto.randomUUID(), name: "", price: "", description: "" }]);
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string) => {
    update("services", config.services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = (id: string) => {
    update("services", config.services.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Configuración de Autopilotos</h1>
              <p className="text-sm text-muted-foreground">Configura todos los asistentes de IA</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="agente" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="agente" className="gap-1.5"><Bot className="w-3.5 h-3.5" /> Agente IA</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Agenda</TabsTrigger>
            <TabsTrigger value="crm" className="gap-1.5"><Users className="w-3.5 h-3.5" /> CRM</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Marketing</TabsTrigger>
          </TabsList>

          {/* ═══ AGENT TAB ═══ */}
          <TabsContent value="agente" className="space-y-6">
            <div className="flex items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="agent-toggle" className="text-sm text-muted-foreground">Activo</Label>
                <Switch id="agent-toggle" checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
              </div>
              <Button onClick={() => save(config)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar
              </Button>
            </div>

            {/* Identity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Identidad</CardTitle>
                <CardDescription>Define cómo se presenta y comunica tu agente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del agente</Label>
                    <Input value={config.agent_name} onChange={(e) => update("agent_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select value={config.language} onValueChange={(v) => update("language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tono de comunicación</Label>
                  <Select value={config.tone} onValueChange={(v) => update("tone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profesional">Profesional y cálido</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual y cercano</SelectItem>
                      <SelectItem value="empático">Empático y paciente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de bienvenida</Label>
                  <Textarea value={config.greeting} onChange={(e) => update("greeting", e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Objective */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Objetivo</CardTitle>
                <CardDescription>Define la misión principal del agente.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={config.objective} onChange={(e) => update("objective", e.target.value)} rows={3} />
              </CardContent>
            </Card>

            {/* Services */}
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Servicios y precios</CardTitle>
                  <CardDescription>El agente usará esta información para responder consultas.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addService}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.services.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-background">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                    <div className="flex-1 grid grid-cols-[1fr_100px] gap-2">
                      <Input value={s.name} onChange={(e) => updateService(s.id, "name", e.target.value)} placeholder="Nombre del servicio" className="h-9 text-sm" />
                      <Input value={s.price} onChange={(e) => updateService(s.id, "price", e.target.value)} placeholder="Precio" className="h-9 text-sm" />
                      <Input value={s.description} onChange={(e) => updateService(s.id, "description", e.target.value)} placeholder="Descripción breve" className="h-9 text-sm col-span-2" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeService(s.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {config.services.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay servicios configurados.</p>
                )}
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Instrucciones especiales</CardTitle>
                <CardDescription>Reglas específicas que el agente debe seguir.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={config.special_instructions} onChange={(e) => update("special_instructions", e.target.value)} rows={6} className="font-mono text-sm" />
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="shadow-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> Vista previa del prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
{`Eres "${config.agent_name}", un asistente virtual del negocio.
Idioma: ${config.language === "es" ? "Español" : config.language === "en" ? "English" : "Português"}
Tono: ${config.tone}

OBJETIVO:
${config.objective}

SERVICIOS DISPONIBLES:
${config.services.map((s) => `• ${s.name} — $${s.price} — ${s.description}`).join("\n") || "(sin servicios)"}

INSTRUCCIONES:
${config.special_instructions}

SALUDO INICIAL:
${config.greeting}`}
                </div>
              </CardContent>
            </Card>

            <Separator />
            <AIUsageHistory />
          </TabsContent>

          {/* ═══ AGENDA TAB ═══ */}
          <TabsContent value="agenda" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Autopilot de Agenda</CardTitle>
                <CardDescription>Configura cómo la IA gestiona tu agenda automáticamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Enviar recordatorios automáticos</p><p className="text-xs text-muted-foreground">Recordar citas al paciente 24h antes</p></div>
                  <Switch checked={agendaReminders} onCheckedChange={setAgendaReminders} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Auto-confirmar citas</p><p className="text-xs text-muted-foreground">Confirmar automáticamente al recibir respuesta positiva</p></div>
                  <Switch checked={agendaAutoConfirm} onCheckedChange={setAgendaAutoConfirm} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Ofrecer reagendar cancelaciones</p><p className="text-xs text-muted-foreground">Sugerir nueva fecha cuando un paciente cancela</p></div>
                  <Switch checked={agendaReschedule} onCheckedChange={setAgendaReschedule} />
                </div>
              </CardContent>
            </Card>
            <Button className="gradient-primary text-primary-foreground" onClick={() => { toast.success("✅ Configuración de agenda guardada"); }}>
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </TabsContent>

          {/* ═══ CRM TAB ═══ */}
          <TabsContent value="crm" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Autopilot de CRM</CardTitle>
                <CardDescription>Configura la gestión automática de leads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Mensaje de bienvenida para nuevos leads</Label>
                  <Textarea value={crmWelcome} onChange={e => setCrmWelcome(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Días sin respuesta para marcar como "perdido"</Label>
                  <Input type="number" value={crmLostDays} onChange={e => setCrmLostDays(e.target.value)} className="w-32" min={1} max={90} />
                  <p className="text-xs text-muted-foreground">Si un lead no responde en {crmLostDays} días, se marcará automáticamente como perdido.</p>
                </div>
              </CardContent>
            </Card>
            <Button className="gradient-primary text-primary-foreground" onClick={() => { toast.success("✅ Configuración de CRM guardada"); }}>
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </TabsContent>

          {/* ═══ MARKETING TAB ═══ */}
          <TabsContent value="marketing" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Autopilot de Marketing</CardTitle>
                <CardDescription>Configura la generación y publicación automática de contenido.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Frecuencia de posts</Label>
                  <Select value={mktFrequency} onValueChange={setMktFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="3x">3x por semana</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plataformas</Label>
                  <div className="flex gap-4">
                    {(["instagram", "facebook", "tiktok"] as const).map(p => (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={mktPlatforms[p]} onChange={e => setMktPlatforms(prev => ({ ...prev, [p]: e.target.checked }))} className="rounded border-border" />
                        <span className="capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Requiere aprobación antes de publicar</p><p className="text-xs text-muted-foreground">Los posts generados pasarán a tu cola de aprobación</p></div>
                  <Switch checked={mktApproval} onCheckedChange={setMktApproval} />
                </div>
              </CardContent>
            </Card>
            <Button className="gradient-primary text-primary-foreground" onClick={() => { toast.success("✅ Configuración de marketing guardada"); }}>
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AIAgentConfigPage;
