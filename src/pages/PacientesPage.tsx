import { useState, useEffect } from "react";
import { Search, Plus, Phone, Mail, Pencil, Trash2, Upload, Download } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PacientesPage = () => {
  const { clinicId } = useClinic();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", dob: "", document: "", notes: "" });
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    if (!clinicId) return;
    const { data } = await supabase.from("patients").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false });
    setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, [clinicId]);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.document || "").includes(search)
  );

  const handleSave = async () => {
    if (!clinicId) return;
    if (editingId) {
      const { error } = await supabase.from("patients").update({
        first_name: form.first_name, last_name: form.last_name, email: form.email,
        phone: form.phone, date_of_birth: form.dob || null, document: form.document, notes: form.notes,
      }).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Paciente actualizado");
    } else {
      const { error } = await supabase.from("patients").insert({
        clinic_id: clinicId, first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone, date_of_birth: form.dob || null,
        document: form.document, notes: form.notes,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Paciente creado");
    }
    setOpen(false); setEditingId(null);
    setForm({ first_name: "", last_name: "", email: "", phone: "", dob: "", document: "", notes: "" });
    fetchPatients();
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email || "", phone: p.phone || "", dob: p.date_of_birth || "", document: p.document || "", notes: p.notes || "" });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("patients").delete().eq("id", id);
    toast.success("Paciente eliminado"); fetchPatients();
  };

  const initials = (p: any) => `${(p.first_name || "")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">Gestiona tu lista de pacientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar CSV</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Descargar Plantilla</Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm({ first_name: "", last_name: "", email: "", phone: "", dob: "", document: "", notes: "" }); } }}>
              <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nuevo Paciente</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingId ? "Editar Paciente" : "Nuevo Paciente"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Nombre *</Label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                    <div><Label>Apellido *</Label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
                  </div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><Label>Documento/RUT</Label><Input value={form.document} onChange={e => setForm({...form, document: e.target.value})} /></div>
                  </div>
                  <div><Label>Fecha de nacimiento</Label><Input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} /></div>
                  <div><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Alergias, condiciones especiales..." /></div>
                  <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.first_name || !form.last_name || !form.email}>{editingId ? "Guardar Cambios" : "Crear Paciente"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre, email o documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-background h-9" />
              </div>
            </div>
            {loading ? (
              <p className="p-8 text-center text-muted-foreground">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">{search ? "Sin resultados" : "No hay pacientes creados aún."}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Documento</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary-foreground">{initials(p)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{p.document || "-"}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {p.phone && <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                            <button className="p-1.5 rounded-md hover:bg-muted"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === "Activo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(p)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PacientesPage;
