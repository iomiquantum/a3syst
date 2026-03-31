import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMarketingFragmentos, type MarketingFragment } from "@/hooks/useMarketingFragmentos";

const FragmentosTab = () => {
  const { fragments, isLoading, createFragment, updateFragment, deleteFragment } = useMarketingFragmentos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingFragment | null>(null);
  const [form, setForm] = useState({ name: "", content: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm({ name: "", content: "" }); setDialogOpen(true); };
  const openEdit = (f: MarketingFragment) => { setEditing(f); setForm({ name: f.name, content: f.content }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.content.trim()) return;
    if (editing) {
      updateFragment.mutate({ id: editing.id, name: form.name, content: form.content }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createFragment.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Crea fragmentos de texto reutilizables para conversaciones</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo Fragmento</Button>
      </div>

      {fragments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay fragmentos. Crea tu primer fragmento para responder más rápido.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fragments.map(f => (
            <Card key={f.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4 space-y-2">
                <p className="font-medium text-sm text-foreground">{f.name}</p>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">{f.type === "con_variables" ? "Con variables" : "Texto plano"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{f.scope === "personal" ? "Personal" : "Equipo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{f.content}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Usado {f.usage_count} veces</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(f)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Fragmento" : "Nuevo Fragmento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Saludo inicial" /></div>
            <div className="space-y-2"><Label>Contenido</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Escribe el contenido..." rows={4} /></div>
            <p className="text-xs text-muted-foreground">Tip: Usa {"{{nombre}}"}, {"{{telefono}}"}, {"{{servicio}}"} para crear plantillas dinámicas</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.content.trim()}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar fragmento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteFragment.mutate(deleteId); setDeleteId(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FragmentosTab;
