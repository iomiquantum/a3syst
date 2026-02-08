import { useState } from "react";
import { Plus, Trash2, Users, UserPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminUsuariosTabProps {
  clinics: any[];
  profiles: any[];
  roles: any[];
  onRefresh: () => void;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  secretary: "Secretario/a",
  professional: "Profesional",
};

const AdminUsuariosTab = ({ clinics, profiles, roles, onRefresh }: AdminUsuariosTabProps) => {
  // Create user form
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Assign user form
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", clinic_id: "", role: "secretary" });

  const handleCreateUser = async () => {
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error("Todos los campos son requeridos");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: createForm.email.trim(),
          password: createForm.password,
          full_name: createForm.full_name.trim(),
        },
      });

      if (response.error) {
        toast.error(response.error.message || "Error al crear usuario");
        setCreating(false);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        setCreating(false);
        return;
      }

      toast.success("Usuario creado exitosamente");
      setCreateOpen(false);
      setCreateForm({ full_name: "", email: "", password: "" });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario");
    }
    setCreating(false);
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
    onRefresh();
  };

  const handleRemoveRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rol eliminado");
    onRefresh();
  };

  // Build a user-centric view: group roles by user
  const userMap = new Map<string, { profile: any; roles: any[] }>();
  profiles.forEach(p => {
    userMap.set(p.user_id, { profile: p, roles: [] });
  });
  roles.forEach(r => {
    const existing = userMap.get(r.user_id);
    if (existing) {
      existing.roles.push(r);
    } else {
      userMap.set(r.user_id, {
        profile: r.profiles || { full_name: "Sin nombre", email: "" },
        roles: [r],
      });
    }
  });

  const userList = Array.from(userMap.values()).sort((a, b) =>
    (a.profile.full_name || "").localeCompare(b.profile.full_name || "")
  );

  const initials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" /> Usuarios del Sistema
        </h2>
        <div className="flex gap-2">
          {/* Create User Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Nuevo Usuario</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} maxLength={100} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} maxLength={255} placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <Label>Contraseña *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createForm.password}
                      onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleCreateUser} className="w-full gradient-primary text-primary-foreground" disabled={creating || !createForm.full_name.trim() || !createForm.email.trim() || createForm.password.length < 6}>
                  {creating ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assign User Dialog */}
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" /> Asignar a Clínica
              </Button>
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
      </div>

      {/* User list */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {userList.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No hay usuarios registrados aún.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Clínicas Asignadas</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Roles</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {userList.map(({ profile, roles: userRoles }) => (
                  <tr key={profile.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-foreground">{initials(profile.full_name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.full_name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {userRoles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sin clínica</span>
                      ) : (
                        <div className="space-y-1">
                          {userRoles.map(r => (
                            <p key={r.id} className="text-sm text-muted-foreground">
                              {(r.clinics as any)?.name || "—"}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {userRoles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map(r => (
                            <span key={r.id} className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              r.role === "admin" ? "bg-primary/10 text-primary" :
                              r.role === "professional" ? "bg-info/10 text-info" :
                              "bg-warning/10 text-warning"
                            }`}>
                              {roleLabels[r.role] || r.role}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {userRoles.map(r => (
                          <button key={r.id} onClick={() => handleRemoveRole(r.id)} title={`Quitar de ${(r.clinics as any)?.name}`} className="p-1.5 rounded-md hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        ))}
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
  );
};

export default AdminUsuariosTab;
