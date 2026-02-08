import { useState } from "react";
import { Bot, Save, Plus, Trash2, GripVertical } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

const AIAgentConfigPage = () => {
  const { toast } = useToast();
  const [agentName, setAgentName] = useState("Asistente IOMI");
  const [language, setLanguage] = useState("es");
  const [objective, setObjective] = useState("Atender consultas de pacientes, agendar citas y proporcionar información sobre tratamientos disponibles.");
  const [tone, setTone] = useState("profesional");
  const [greeting, setGreeting] = useState("¡Hola! 👋 Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?");
  const [specialInstructions, setSpecialInstructions] = useState("- Siempre preguntar nombre y teléfono antes de agendar.\n- No dar diagnósticos médicos.\n- Derivar urgencias al número de emergencia.\n- Ofrecer la primera consulta gratuita cuando el lead muestre interés.");
  const [enabled, setEnabled] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>([
    { id: "1", name: "Limpieza dental", price: "15000", description: "Limpieza profesional con ultrasonido" },
    { id: "2", name: "Blanqueamiento", price: "45000", description: "Blanqueamiento LED en consultorio" },
    { id: "3", name: "Ortodoncia", price: "350000", description: "Tratamiento completo con brackets" },
  ]);

  const addService = () => {
    setServices([...services, { id: crypto.randomUUID(), name: "", price: "", description: "" }]);
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string) => {
    setServices(services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    toast({ title: "Configuración guardada", description: "La configuración del agente IA se actualizó correctamente." });
  };

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
              <h1 className="text-xl font-bold text-foreground">Agente IA</h1>
              <p className="text-sm text-muted-foreground">Configura el comportamiento del asistente virtual</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-toggle" className="text-sm text-muted-foreground">Activo</Label>
              <Switch id="agent-toggle" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </div>
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
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ej: Asistente IOMI" />
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
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
              <Select value={tone} onValueChange={setTone}>
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
              <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Objective */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Objetivo</CardTitle>
            <CardDescription>Define la misión principal del agente en cada conversación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} placeholder="Describe qué debe lograr el agente en cada interacción..." />
          </CardContent>
        </Card>

        {/* Services & Prices */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Servicios y precios</CardTitle>
              <CardDescription>El agente usará esta información para responder consultas sobre tratamientos.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addService}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-background">
                <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0 cursor-grab" />
                <div className="flex-1 grid grid-cols-[1fr_100px] gap-2">
                  <Input
                    value={s.name}
                    onChange={(e) => updateService(s.id, "name", e.target.value)}
                    placeholder="Nombre del servicio"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={s.price}
                    onChange={(e) => updateService(s.id, "price", e.target.value)}
                    placeholder="Precio"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={s.description}
                    onChange={(e) => updateService(s.id, "description", e.target.value)}
                    placeholder="Descripción breve"
                    className="h-9 text-sm col-span-2"
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeService(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay servicios configurados. Agrega uno para que el agente pueda informar sobre precios.</p>
            )}
          </CardContent>
        </Card>

        {/* Special Instructions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Instrucciones especiales</CardTitle>
            <CardDescription>Reglas específicas que el agente debe seguir. Una por línea.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={6}
              placeholder="- No dar diagnósticos médicos&#10;- Siempre pedir nombre y teléfono&#10;- Derivar urgencias al +54 11 ..."
              className="font-mono text-sm"
            />
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
{`Eres "${agentName}", un asistente virtual de una clínica dental.
Idioma: ${language === "es" ? "Español" : language === "en" ? "English" : "Português"}
Tono: ${tone}

OBJETIVO:
${objective}

SERVICIOS DISPONIBLES:
${services.map((s) => `• ${s.name} — $${s.price} — ${s.description}`).join("\n")}

INSTRUCCIONES:
${specialInstructions}

SALUDO INICIAL:
${greeting}`}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AIAgentConfigPage;
