import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Building2, MapPin, Phone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SucursalesPage = () => {
  const { clinicId } = useClinic();
  const [branches, setBranches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", description: "" });
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    if (!clinicId) return;
    const { data } = await supabase.from("branches").select("*").eq("clinic_id", clinicId).order("created_at");
    setBranches(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, [clinicId]);

  const handleSave = async () => {
    if (!clinicId) return;
    if (editingId) {
      const { error } = await supabase.from("branches").update({ name: form.name, address: form.address, phone: form.phone, description: form.description }).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Sucursal actualizada");
    } else {
      const { error } = await supabase.from("branches").insert({ clinic_id: clinicId, name: form.name, address: form.address, phone: form.phone, description: form.description });
      if (error) { toast.error(error.message); return; }
      toast.success("Sucursal creada");
    }
    setOpen(false); setEditingId(null); setForm({ name: "", address: "", phone: "", description: "" });
    fetchBranches();
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address || "", phone: b.phone || "", description: b.description || "" });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sucursal eliminada");
    fetchBranches();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sucursales</h1>
            <p className="text-muted-foreground">Gestiona las sucursales de tu clínica</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm({ name: "", address: "", phone: "", description: "" }); } }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nueva Sucursal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nombre de la sucursal" /></div>
                <div><Label>Dirección *</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Dirección completa" /></div>
                <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.name || !form.address}>{editingId ? "Guardar Cambios" : "Crear Sucursal"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : branches.length === 0 ? (
          <Card className="shadow-card"><CardContent className="p-8 text-center"><p className="text-muted-foreground">No hay sucursales creadas aún. Crea tu primera sucursal.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(branch => (
              <Card key={branch.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                      <CardTitle className="text-base">{branch.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(branch)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(branch.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {branch.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /><span>{branch.address}</span></div>}
                  {branch.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{branch.phone}</span></div>}
                  {branch.description && <p className="text-sm text-muted-foreground pt-1">{branch.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SucursalesPage;
