import { useState } from "react";
import { Send, Plus, Clock, CheckCircle2, XCircle, Eye, MousePointerClick, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketingDifusiones } from "@/hooks/useMarketingDifusiones";
import { useMarketingAudiencias } from "@/hooks/useMarketingAudiencias";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  borrador: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Borrador" },
  programada: { icon: Clock, color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]", label: "Programada" },
  enviando: { icon: Clock, color: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]", label: "Enviando" },
  enviada: { icon: CheckCircle2, color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]", label: "Enviada" },
  fallida: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Fallida" },
};

const DifusionesTab = () => {
  const { broadcasts, isLoading, createBroadcast, deleteBroadcast } = useMarketingDifusiones();
  const { audiences } = useMarketingAudiencias();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "whatsapp", audience_id: "", scheduled_at: "" });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createBroadcast.mutate({
      name: form.name,
      channel: form.channel,
      audience_id: form.audience_id || undefined,
      scheduled_at: form.scheduled_at || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", channel: "whatsapp", audience_id: "", scheduled_at: "" });
      },
    });
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gestiona tus campañas de difusión masiva por WhatsApp.</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva difusión
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay difusiones. Crea tu primera campaña de WhatsApp.</p>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const cfg = statusConfig[b.status] || statusConfig.borrador;
            const StatusIcon = cfg.icon;
            return (
              <Card key={b.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.audience?.name || "Sin audiencia"} · {b.channel}</p>
                  </div>
                  <Badge variant="outline" className={cfg.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                  {b.status === "enviada" && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{b.total_recipients} enviados</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{b.read_count}</span>
                    </div>
                  )}
                  {b.status === "borrador" && (
                    <button onClick={() => deleteBroadcast.mutate(b.id)} className="p-1.5 rounded-md hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva difusión masiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la campaña</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Promo Marzo 2026" />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audiencia</Label>
              <Select value={form.audience_id} onValueChange={v => setForm({ ...form, audience_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar audiencia" /></SelectTrigger>
                <SelectContent>
                  {audiences.length === 0 ? (
                    <SelectItem value="" disabled>No hay audiencias creadas</SelectItem>
                  ) : (
                    audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Programar envío (opcional)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || createBroadcast.isPending}>Guardar borrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DifusionesTab;
