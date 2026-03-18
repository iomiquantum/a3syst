import { useState, useMemo } from "react";
import { Plus, Trash2, Users, UserPlus, Eye, EyeOff, Search, Power, UserX, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminUsuariosTabProps {
  clinics: any[];
  profiles: any[];
  roles: any[];
  onRefresh: () => void;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  secretary: "Secretario/a",
  professional: "Profesional",
  empleado: "Empleado",
  vendedor: "Vendedor",
};

const allRoles = ["admin", "manager", "secretary", "professional", "empleado", "vendedor"];

const AdminUsuariosTab = ({ clinics, profiles, roles, onRefresh }: AdminUsuariosTabProps) => {
  const [searchFilter, setSearchFilter] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", clinic_id: "", role: "empleado" });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", clinic_id: "", role: "empleado" });

  const handleCreateUser = async () => {
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error("Nombre, email y contraseña son requeridos");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: createForm.email.trim(),
          password: createForm.password,
          full_name: createForm.full_name.trim(),
          clinic_id: createForm.clinic_id || undefined,
          role: createForm.role || undefined,
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

      toast.success(response.data?.message || "Usuario creado exitosamente");
      setCreateOpen(false);
      setCreateForm({ full_name: "", email: "", password: "", clinic_id: "", role: "empleado" });
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

    const response = await supabase.functions.invoke("create-user", {
      body: {
        email: profiles.find(p => p.user_id === assignForm.user_id)?.email || "",
        password: "placeholder",
        full_name: profiles.find(p => p.user_id === assignForm.user_id)?.full_name || "",
        clinic_id: assignForm.clinic_id,
        role: assignForm.role,
      },
    });

    if (response.data?.error) {
      toast.error(response.data.error);
      return;
    }

    toast.success("Usuario asignado a la clínica");
    setAssignOpen(false);
    setAssignForm({ user_id: "", clinic_id: "", role: "empleado" });
    onRefresh();
  };

  const handleRemoveRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rol eliminado");
    onRefresh();
  };

  const handleSuspendUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ estado: "suspendido" } as any).eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Usuario apagado");
    onRefresh();
  };

  const handleReactivateUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ estado: "activo" } as any).eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Usuario encendido");
    onRefresh();
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const confirmed = window.confirm(`¿Eliminar completamente al usuario ${email}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      const response = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });

      if (response.error) {
        toast.error(response.error.message || "No se pudo eliminar el usuario");
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success("Usuario eliminado");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar el usuario");
    } finally {
      setDeletingUserId(null);
    }
  };

  const userMap = new Map<string, { profile: any; roles: any[] }>();
  profiles.forEach((p) => {
    userMap.set(p.user_id, { profile: p, roles: [] });
  });
  roles.forEach((r) => {
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

  const userList = useMemo(() => {
    let list = Array.from(userMap.values());

    if (clinicFilter && clinicFilter !== "all") {
      list = list.filter((u) => u.roles.some((r) => r.clinic_id === clinicFilter));
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (u) =>
          (u.profile.full_name || "").toLowerCase().includes(q) ||
          (u.profile.email || "").toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (a.profile.full_name || "").localeCompare(b.profile.full_name || ""));
  }, [clinicFilter, searchFilter, userMap]);

  const initials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-destructive/10 text-destructive";
      case "admin":
        return "bg-primary/10 text-primary";
      case "manager":
        return "bg-accent/50 text-accent-foreground";
      case "professional":
        return "bg-info/10 text-info";
      case "vendedor":
        return "bg-success/10 text-success";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" /> Usuarios del Sistema ({userList.length})
        </h2>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} maxLength={100} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} maxLength={255} placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <Label>Contraseña *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Clínica (opcional)</Label>
                  <Select value={createForm.clinic_id} onValueChange={(v) => setCreateForm({ ...createForm, clinic_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a clínica" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {createForm.clinic_id && (
                  <div>
                    <Label>Rol</Label>
                    <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleCreateUser} className="w-full gradient-primary text-primary-foreground" disabled={creating || !createForm.full_name.trim() || !createForm.email.trim() || createForm.password.length < 6}>
                  {creating ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" /> Asignar a Clínica
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Usuario a Clínica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Usuario *</Label>
                  <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm({ ...assignForm, user_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name || p.email} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Clínica *</Label>
                  <Select value={assignForm.clinic_id} onValueChange={(v) => setAssignForm({ ...assignForm, clinic_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar clínica" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rol *</Label>
                  <Select value={assignForm.role} onValueChange={(v) => setAssignForm({ ...assignForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabels[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignUser} className="w-full gradient-primary text-primary-foreground" disabled={!assignForm.user_id || !assignForm.clinic_id}>
                  Asignar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-9" />
        </div>
        <Select value={clinicFilter} onValueChange={setClinicFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por clínica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las clínicas</SelectItem>
            {clinics.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {userList.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No hay usuarios que coincidan con los filtros.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Clínicas</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Roles</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {userList.map(({ profile, roles: userRoles }) => {
                  const estado = (profile as any)?.estado || "activo";
                  const isSuspended = estado === "suspendido";
                  const canDeleteUser = userRoles.length === 0;
                  const isDeleting = deletingUserId === profile.user_id;

                  return (
                    <tr key={profile.user_id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${isSuspended ? "opacity-60" : ""}`}>
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
                        <Badge variant={isSuspended ? "destructive" : "outline"} className="text-xs">
                          {isSuspended ? "Suspendido" : "Activo"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {userRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin clínica</span>
                        ) : (
                          <div className="space-y-1">
                            {userRoles.map((r) => (
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
                            {userRoles.map((r) => (
                              <span key={r.id} className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleStyle(r.role)}`}>
                                {roleLabels[r.role] || r.role}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle activar/desactivar */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Switch
                                    checked={!isSuspended}
                                    onCheckedChange={(checked) =>
                                      checked ? handleReactivateUser(profile.user_id) : handleSuspendUser(profile.user_id)
                                    }
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{isSuspended ? "Activar usuario" : "Desactivar usuario"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Quitar de clínica (por cada rol) */}
                          {userRoles.map((r) => (
                            <TooltipProvider key={r.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => handleRemoveRole(r.id)} className="p-1.5 rounded-md hover:bg-warning/10">
                                    <X className="w-4 h-4 text-warning" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Quitar de {(r.clinics as any)?.name || "clínica"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}

                          {/* Eliminar usuario */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleDeleteUser(profile.user_id, profile.email)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-md hover:bg-destructive/10 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar usuario</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsuariosTab;
