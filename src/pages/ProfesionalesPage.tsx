import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfesionalesPage = () => {
  const { clinicId } = useClinic();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", specialty_id: "", branch_id: "" });

  const fetchData = async () => {
    if (!clinicId) return;
    const [{ data: p }, { data: s }, { data: b }] = await Promise.all([
      supabase.from("professionals").select("*, specialties(name), branches(name)").eq("clinic_id", clinicId).order("created_at"),
      supabase.from("specialties").select("*").eq("clinic_id", clinicId),
      supabase.from("branches").select("*").eq("clinic_id", clinicId),
    ]);
    setProfessionals(p || []);
    setSpecialties(s || []);
    setBranches(b || []);
  };

  useEffect(() => { fetchData(); }, [clinicId]);

  const handleSave = async () => {
    if (!clinicId) return;
    const { error } = await supabase.from("professionals").insert({
      clinic_id: clinicId, full_name: form.full_name, email: form.email,
      phone: form.phone, specialty_id: form.specialty_id || null, branch_id: form.branch_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Profesional creado");
    setOpen(false); setForm({ full_name: "", email: "", phone: "", specialty_id: "", branch_id: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("professionals").delete().eq("id", id);
    toast.success("Profesional eliminado"); fetchData();
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profesionales</h1>
            <p className="text-muted-foreground">Gestiona los profesionales de tu clínica</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nuevo Profesional</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Profesional</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Nombre completo *</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Especialidad</Label>
                    <Select value={form.specialty_id} onValueChange={v => setForm({...form, specialty_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sucursal</Label>
                    <Select value={form.branch_id} onValueChange={v => setForm({...form, branch_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.full_name || !form.email}>Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {professionals.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No hay profesionales creados aún. Primero crea sucursales y especialidades.</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Profesional</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Especialidad</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Sucursal</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr></thead>
                <tbody>
                  {professionals.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary-foreground">{initials(p.full_name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.specialties?.name ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{p.specialties.name}</span> : <span className="text-sm text-muted-foreground">-</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.branches?.name || "-"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 rounded-md hover:bg-muted"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          {p.phone && <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProfesionalesPage;
