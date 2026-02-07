import { useState } from "react";
import { Plus, Pencil, Trash2, Lock, Shield, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const initialUsers = [
  { id: 1, name: "VitalFarme Admin", email: "contactovitalfarme@gmail.com", role: "Administrador", initials: "VA", permissions: { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true } },
  { id: 2, name: "María Secretaría", email: "maria@clinica.com", role: "Secretario/a", initials: "MS", permissions: { agenda: true, pacientes: true, ventas: true, configuracion: false, reportes: false } },
  { id: 3, name: "Dr. Juan Pérez", email: "juan@clinica.com", role: "Profesional", initials: "JP", permissions: { agenda: true, pacientes: true, ventas: false, configuracion: false, reportes: false } },
];

const permissionLabels: Record<string, string> = {
  agenda: "Agenda y Turnos",
  pacientes: "Pacientes",
  ventas: "Ventas",
  configuracion: "Configuración",
  reportes: "Reportes",
};

const UsuariosPage = () => {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "" });

  const handleSave = () => {
    const names = form.name.split(" ");
    const initials = names.length >= 2 ? `${names[0][0]}${names[names.length-1][0]}`.toUpperCase() : form.name.substring(0,2).toUpperCase();
    const defaultPerms = form.role === "Administrador" 
      ? { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true }
      : { agenda: true, pacientes: true, ventas: false, configuracion: false, reportes: false };
    setUsers([...users, { id: Date.now(), ...form, initials, permissions: defaultPerms }]);
    setOpen(false);
    setForm({ name: "", email: "", role: "" });
  };

  const togglePermission = (userId: number, key: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, permissions: { ...u.permissions, [key]: !u.permissions[key as keyof typeof u.permissions] } } : u));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuarios y Roles</h1>
            <p className="text-muted-foreground">Gestiona el acceso al sistema</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Nombre completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div>
                  <Label>Rol *</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Secretario/a">Secretario/a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Al crear el usuario, se enviará un email con las credenciales de acceso.</p>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.name || !form.email || !form.role}>Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
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
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-foreground">{u.initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        u.role === "Administrador" ? "bg-primary/10 text-primary" :
                        u.role === "Profesional" ? "bg-info/10 text-info" :
                        "bg-warning/10 text-warning"
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {Object.values(u.permissions).filter(Boolean).length === 5 ? (
                          <div className="flex items-center gap-1 text-xs text-success"><ShieldCheck className="w-3.5 h-3.5" /> Acceso total</div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5" /> {Object.values(u.permissions).filter(Boolean).length}/5 módulos</div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog open={permissionsOpen === u.id} onOpenChange={o => setPermissionsOpen(o ? u.id : null)}>
                          <DialogTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted"><Lock className="w-4 h-4 text-muted-foreground" /></button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Permisos - {u.name}</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                              {Object.entries(u.permissions).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between py-2">
                                  <Label className="text-sm">{permissionLabels[key]}</Label>
                                  <Switch checked={value} onCheckedChange={() => togglePermission(u.id, key)} />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <button className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => setUsers(users.filter(x => x.id !== u.id))} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default UsuariosPage;
