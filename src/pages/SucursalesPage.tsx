import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, MapPin, Phone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialBranches = [
  { id: 1, name: "Sede Central", address: "Av. Corrientes 1234, CABA", phone: "+54 11 4567-8901", description: "Sede principal de la clínica", active: true },
  { id: 2, name: "Sucursal Norte", address: "Av. Cabildo 2345, CABA", phone: "+54 11 5678-9012", description: "Sucursal zona norte", active: true },
];

const SucursalesPage = () => {
  const [branches, setBranches] = useState(initialBranches);
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<typeof initialBranches[0] | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", description: "" });

  const handleSave = () => {
    if (editingBranch) {
      setBranches(branches.map(b => b.id === editingBranch.id ? { ...b, ...form } : b));
    } else {
      setBranches([...branches, { id: Date.now(), ...form, active: true }]);
    }
    setOpen(false);
    setForm({ name: "", address: "", phone: "", description: "" });
    setEditingBranch(null);
  };

  const handleEdit = (branch: typeof initialBranches[0]) => {
    setEditingBranch(branch);
    setForm({ name: branch.name, address: branch.address, phone: branch.phone, description: branch.description });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    setBranches(branches.filter(b => b.id !== id));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sucursales</h1>
            <p className="text-muted-foreground">Gestiona las sucursales de tu clínica</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingBranch(null); setForm({ name: "", address: "", phone: "", description: "" }); } }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nombre de la sucursal" /></div>
                <div><Label>Dirección *</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Dirección completa" /></div>
                <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+54 11 ..." /></div>
                <div><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción de la sucursal" /></div>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.name || !form.address}>
                  {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => (
            <Card key={branch.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(branch)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(branch.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" /><span>{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" /><span>{branch.phone}</span>
                </div>
                <p className="text-sm text-muted-foreground pt-1">{branch.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default SucursalesPage;
