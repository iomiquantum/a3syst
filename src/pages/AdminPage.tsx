import { useState, useEffect } from "react";
import { Plus, Trash2, Building2, Users, Shield, UserPlus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClinic } from "@/hooks/useClinic";

const AdminPage = () => {
  const { isSuperAdmin, allClinics, selectClinic } = useClinic();
  const [clinics, setClinics] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clinic form
  const [clinicOpen, setClinicOpen] = useState(false);
  const [clinicForm, setClinicForm] = useState({ name: "", description: "", address: "" });

  // Assign user form
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", clinic_id: "", role: "secretary" as string });

  const fetchData = async () => {
    const [{ data: c }, { data: p }, { data: rolesData }] = await Promise.all([
      supabase.from("clinics").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("*, clinics(name)").order("created_at"),
    ]);

    // Enrich roles with profile data separately
    const profilesMap: Record<string, any> = {};
    (p || []).forEach(pr => { profilesMap[pr.user_id] = pr; });
    const enrichedRoles = (rolesData || []).map(r => ({
      ...r,
      profiles: profilesMap[r.user_id] || { full_name: "Sin nombre", email: "" },
    }));

    setClinics(c || []);
    setProfiles(p || []);
    setRoles(enrichedRoles);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateClinic = async () => {
    if (!clinicForm.name.trim()) { toast.error("El nombre es requerido"); return; }
    // We need an owner. For super-admin-created clinics, we set the super admin as owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("clinics").insert({
      name: clinicForm.name.trim(),
      description: clinicForm.description.trim(),
      address: clinicForm.address.trim(),
      owner_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Clínica creada");
    setClinicOpen(false);
    setClinicForm({ name: "", description: "", address: "" });
    fetchData();
  };

  const handleDeleteClinic = async (id: string) => {
    const { error } = await supabase.from("clinics").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Clínica eliminada");
    fetchData();
  };

  const handleAssignUser = async () => {
    if (!assignForm.user_id || !assignForm.clinic_id || !assignForm.role) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    const defaultPerms = assignForm.role === "admin"
      ? { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true }
      : assignForm.role === "secretary"
      ? { agenda: true, pacientes: true, ventas: true, configuracion: false, reportes: false }
      : { agenda: true, pacientes: true, ventas: false, configuracion: false, reportes: false };

    const { error } = await supabase.from("user_roles").insert({
      user_id: assignForm.user_id,
      clinic_id: assignForm.clinic_id,
      role: assignForm.role as "admin" | "secretary" | "professional",
      permissions: defaultPerms,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Usuario asignado a la clínica");
    setAssignOpen(false);
    setAssignForm({ user_id: "", clinic_id: "", role: "secretary" });
    fetchData();
  };

  const handleRemoveRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rol eliminado");
    fetchData();
  };

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Super Admin</h1>
          <p className="text-muted-foreground">Gestiona clínicas y asigna usuarios</p>
        </div>

        {/* Clinics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5" /> Clínicas</h2>
            <Dialog open={clinicOpen} onOpenChange={setClinicOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nueva Clínica</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Clínica</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Nombre *</Label><Input value={clinicForm.name} onChange={e => setClinicForm({ ...clinicForm, name: e.target.value })} maxLength={100} placeholder="Nombre de la clínica" /></div>
                  <div><Label>Dirección</Label><Input value={clinicForm.address} onChange={e => setClinicForm({ ...clinicForm, address: e.target.value })} maxLength={300} /></div>
                  <div><Label>Descripción</Label><Textarea value={clinicForm.description} onChange={e => setClinicForm({ ...clinicForm, description: e.target.value })} maxLength={500} /></div>
                  <Button onClick={handleCreateClinic} className="w-full gradient-primary text-primary-foreground" disabled={!clinicForm.name.trim()}>Crear Clínica</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinics.map(c => (
                <Card key={c.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => selectClinic(c.id, c.name)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClinic(c.id); }} className="p-1.5 rounded-md hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {c.address && <p className="text-sm text-muted-foreground">{c.address}</p>}
                    {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {roles.filter(r => r.clinic_id === c.id).length} usuario(s) asignado(s)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Assign Users Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Users className="w-5 h-5" /> Usuarios Asignados</h2>
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground hover:opacity-90"><UserPlus className="w-4 h-4 mr-2" /> Asignar Usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Asignar Usuario a Clínica</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Usuario *</Label>
                    <Select value={assignForm.user_id} onValueChange={v => setAssignForm({ ...assignForm, user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email} ({p.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Clínica *</Label>
                    <Select value={assignForm.clinic_id} onValueChange={v => setAssignForm({ ...assignForm, clinic_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar clínica" /></SelectTrigger>
                      <SelectContent>
                        {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rol *</Label>
                    <Select value={assignForm.role} onValueChange={v => setAssignForm({ ...assignForm, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="secretary">Secretario/a</SelectItem>
                        <SelectItem value="professional">Profesional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignUser} className="w-full gradient-primary text-primary-foreground" disabled={!assignForm.user_id || !assignForm.clinic_id}>Asignar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-0">
              {roles.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No hay asignaciones de usuario aún.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Clínica</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Rol</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(r => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-foreground">{(r.profiles as any)?.full_name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{(r.profiles as any)?.email || ""}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{(r.clinics as any)?.name || "-"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            r.role === "admin" ? "bg-primary/10 text-primary" :
                            r.role === "professional" ? "bg-info/10 text-info" :
                            "bg-warning/10 text-warning"
                          }`}>
                            {r.role === "admin" ? "Administrador" : r.role === "professional" ? "Profesional" : "Secretario/a"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => handleRemoveRole(r.id)} className="p-1.5 rounded-md hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminPage;
