import { useState, useEffect } from "react";
import { Trash2, Lock, Shield, ShieldCheck } from "lucide-react";
import { validatePermissions } from "@/lib/permissions";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const permissionLabels: Record<string, string> = {
  agenda: "Agenda y Turnos",
  pacientes: "Pacientes",
  ventas: "Ventas",
  configuracion: "Configuración",
  reportes: "Reportes",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  secretary: "Secretario/a",
  professional: "Profesional",
};

const UsuariosPage = () => {
  const { clinicId } = useClinic();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionsOpen, setPermissionsOpen] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("clinic_id", clinicId);
    if (error) { toast.error(error.message); setLoading(false); return; }

    // Fetch profiles separately to avoid missing relationship
    const userIds = (roles || []).map(r => r.user_id);
    let profilesMap: Record<string, { full_name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      (profiles || []).forEach(p => { profilesMap[p.user_id] = p; });
    }

    const enriched = (roles || []).map(r => ({
      ...r,
      profiles: profilesMap[r.user_id] || { full_name: "Sin nombre", email: "" },
    }));
    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [clinicId]);

  const togglePermission = async (roleId: string, key: string) => {
    const user = users.find(u => u.id === roleId);
    if (!user) return;
    const currentPerms = user.permissions as Record<string, boolean>;
    const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
    const validated = validatePermissions(newPerms);
    if (!validated) { toast.error("Permisos inválidos"); return; }

    const { error } = await supabase
      .from("user_roles")
      .update({ permissions: validated })
      .eq("id", roleId);

    if (error) { toast.error(error.message); return; }
    setUsers(users.map(u => u.id === roleId ? { ...u, permissions: newPerms } : u));
    toast.success("Permiso actualizado");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Usuario eliminado");
    fetchUsers();
  };

  const initials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "admin": return "bg-primary/10 text-primary";
      case "professional": return "bg-info/10 text-info";
      default: return "bg-warning/10 text-warning";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuarios y Roles</h1>
            <p className="text-muted-foreground">Gestiona el acceso al sistema</p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-8 text-center text-muted-foreground">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No hay usuarios con roles asignados.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Rol</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Permisos</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const perms = u.permissions as Record<string, boolean>;
                    const activeCount = Object.values(perms).filter(Boolean).length;
                    const totalCount = Object.keys(perms).length;
                    const profileName = (u.profiles as any)?.full_name || "Sin nombre";
                    const profileEmail = (u.profiles as any)?.email || "";

                    return (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary-foreground">{initials(profileName)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{profileName}</p>
                              <p className="text-xs text-muted-foreground">{profileEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleStyle(u.role)}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            {activeCount === totalCount ? (
                              <div className="flex items-center gap-1 text-xs text-success"><ShieldCheck className="w-3.5 h-3.5" /> Acceso total</div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5" /> {activeCount}/{totalCount} módulos</div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Dialog open={permissionsOpen === u.id} onOpenChange={o => setPermissionsOpen(o ? u.id : null)}>
                              <button onClick={() => setPermissionsOpen(u.id)} className="p-1.5 rounded-md hover:bg-muted"><Lock className="w-4 h-4 text-muted-foreground" /></button>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Permisos - {profileName}</DialogTitle></DialogHeader>
                                <div className="space-y-4 pt-2">
                                  {Object.entries(perms).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between py-2">
                                      <Label className="text-sm">{permissionLabels[key] || key}</Label>
                                      <Switch checked={value as boolean} onCheckedChange={() => togglePermission(u.id, key)} />
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                            {u.role !== "admin" && (
                              <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                            )}
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
    </AppLayout>
  );
};

export default UsuariosPage;
