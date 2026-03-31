import { useState } from "react";
import { Users, Plus, Filter, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketingAudiencias } from "@/hooks/useMarketingAudiencias";

const AudienciasTab = () => {
  const { audiences, isLoading, createAudience, deleteAudience } = useMarketingAudiencias();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "dinamica" });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createAudience.mutate({ name: form.name, description: form.description || undefined, type: form.type }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", description: "", type: "dinamica" });
      },
    });
  };

  const totalContacts = audiences.reduce((sum, a) => sum + (a.contact_count || 0), 0);
  const activeCount = audiences.filter(a => a.status === "activa").length;

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total audiencias", value: audiences.length },
          { label: "Activas", value: activeCount },
          { label: "Total contactos", value: totalContacts },
          { label: "Promedio", value: audiences.length > 0 ? Math.round(totalContacts / audiences.length) : 0 },
        ].map(k => (
          <Card key={k.label} className="shadow-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Segmenta tus contactos en audiencias para campañas dirigidas.</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva audiencia
        </Button>
      </div>

      {audiences.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay audiencias. Crea tu primera audiencia para segmentar contactos.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {audiences.map((a) => (
            <Card key={a.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.contact_count} contactos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{a.type === "dinamica" ? "Dinámica" : "Estática"}</Badge>
                    <button onClick={() => deleteAudience.mutate(a.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                {a.filters && Object.keys(a.filters).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Object.entries(a.filters).map(([key, val]) => (
                      <Badge key={key} variant="secondary" className="text-[10px]">
                        <Filter className="w-2.5 h-2.5 mr-1" />{key}: {String(val)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva audiencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Leads interesados en implantes" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe esta audiencia..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinamica">Dinámica (se actualiza automáticamente)</SelectItem>
                  <SelectItem value="estatica">Estática (selección manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || createAudience.isPending}>Crear audiencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudienciasTab;
