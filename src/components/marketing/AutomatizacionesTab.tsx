import { Sparkles, Zap, GitBranch, MessageSquare, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const cards = [
  { icon: Zap, title: "Triggers", desc: "Eventos que inician el flujo: Cita agendada, Cambio de etapa, Nuevo contacto", color: "bg-primary/10 text-primary" },
  { icon: GitBranch, title: "Condiciones", desc: "Evaluaciones que dividen el flujo: Esperas temporales, Condiciones lógicas", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  { icon: MessageSquare, title: "Acciones", desc: "Tareas a ejecutar: WhatsApp con plantillas, Email", color: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  { icon: Webhook, title: "Webhooks", desc: "Envía datos a Zapier, Make, n8n", color: "bg-accent/10 text-accent" },
];

const AutomatizacionesTab = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Crea flujos automáticos basados en eventos</p>
      </div>
      <Badge variant="secondary" className="gap-1"><Sparkles className="w-3 h-3" /> Próximamente</Badge>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {cards.map(c => (
        <Card key={c.title} className="shadow-card">
          <CardContent className="p-4 flex gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Button onClick={() => toast.info("Las automatizaciones estarán disponibles próximamente")}>
      + Nueva automatización
    </Button>
  </div>
);

export default AutomatizacionesTab;
