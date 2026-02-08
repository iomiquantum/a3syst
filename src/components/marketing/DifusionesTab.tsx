import { useState } from "react";
import { Send, Plus, Clock, CheckCircle2, XCircle, Eye, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Broadcast {
  id: string;
  name: string;
  channel: string;
  audience: string;
  status: "borrador" | "programada" | "enviada" | "fallida";
  sentAt?: string;
  recipients: number;
  opened: number;
  clicked: number;
}

const mockBroadcasts: Broadcast[] = [
  { id: "1", name: "Promo Blanqueamiento Febrero", channel: "whatsapp", audience: "Todos los contactos", status: "enviada", sentAt: "2026-02-05 10:00", recipients: 340, opened: 231, clicked: 89 },
  { id: "2", name: "Recordatorio control semestral", channel: "whatsapp", audience: "Pacientes activos", status: "programada", recipients: 520, opened: 0, clicked: 0 },
  { id: "3", name: "Bienvenida nuevos leads", channel: "whatsapp", audience: "Nuevos", status: "borrador", recipients: 0, opened: 0, clicked: 0 },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  borrador: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Borrador" },
  programada: { icon: Clock, color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]", label: "Programada" },
  enviada: { icon: CheckCircle2, color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]", label: "Enviada" },
  fallida: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Fallida" },
};

const DifusionesTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gestiona tus campañas de difusión masiva por WhatsApp.</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva difusión
        </Button>
      </div>

      <div className="space-y-3">
        {mockBroadcasts.map((b) => {
          const cfg = statusConfig[b.status];
          const StatusIcon = cfg.icon;
          return (
            <Card key={b.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.audience} · {b.channel}</p>
                </div>
                <Badge variant="outline" className={cfg.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </Badge>
                {b.status === "enviada" && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{b.recipients} enviados</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{b.opened}</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{b.clicked}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva difusión masiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la campaña</Label>
              <Input placeholder="Ej: Promo Marzo 2026" />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select defaultValue="whatsapp">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audiencia</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Seleccionar audiencia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los contactos</SelectItem>
                  <SelectItem value="nuevos">Nuevos</SelectItem>
                  <SelectItem value="pacientes">Pacientes activos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea placeholder="Escribe el contenido del mensaje..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setDialogOpen(false)}>Guardar borrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DifusionesTab;
