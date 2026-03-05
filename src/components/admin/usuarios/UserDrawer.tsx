import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Shield, Pause, Play, Mail, Save } from "lucide-react";
import { UsuarioCompleto, roleLabelsAdmin, roleColors, estadoColors } from "@/hooks/useUsuariosAdmin";
import ActivityTimeline from "./ActivityTimeline";

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UsuarioCompleto | null;
  onChangeRole: (roleId: string, currentRole: string) => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onSaveNotas: (notas: string) => void;
  onResetPassword: () => void;
}

const UserDrawer = ({ open, onOpenChange, user, onChangeRole, onSuspend, onReactivate, onSaveNotas, onResetPassword }: UserDrawerProps) => {
  const [notas, setNotas] = useState("");
  const [notasEdited, setNotasEdited] = useState(false);

  if (!user) return null;

  const initials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && user) {
      setNotas(user.notas || "");
      setNotasEdited(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Perfil del Usuario</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.full_name} {user.apellido}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-1 mt-1">
                {user.roles.map(r => (
                  <Badge key={r.id} className={`text-xs ${roleColors[r.role] || "bg-muted"}`}>
                    {roleLabelsAdmin[r.role] || r.role}
                  </Badge>
                ))}
                <Badge className={`text-xs ${estadoColors[user.estado] || "bg-muted"}`}>
                  {user.estado}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{user.telefono || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empresas</span>
              <span>{user.roles.map(r => r.clinic_name).join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Último acceso</span>
              <span>{user.ultimo_acceso ? formatDistanceToNow(new Date(user.ultimo_acceso), { addSuffix: true, locale: es }) : "Nunca"}</span>
            </div>
          </div>

          <Separator />

          {/* Notas */}
          <div>
            <Label>Notas del Admin</Label>
            <Textarea
              value={notasEdited ? notas : (user.notas || "")}
              onChange={e => { setNotas(e.target.value); setNotasEdited(true); }}
              rows={3}
              placeholder="Notas internas sobre este usuario..."
              maxLength={2000}
            />
            {notasEdited && (
              <Button size="sm" className="mt-2" onClick={() => { onSaveNotas(notas); setNotasEdited(false); }}>
                <Save className="w-3 h-3 mr-1" /> Guardar
              </Button>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {user.roles.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onChangeRole(user.roles[0].id, user.roles[0].role)}>
                <Shield className="w-3 h-3 mr-1" /> Cambiar Rol
              </Button>
            )}
            {user.estado === "activo" ? (
              <Button variant="outline" size="sm" className="text-destructive" onClick={onSuspend}>
                <Pause className="w-3 h-3 mr-1" /> Suspender
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onReactivate}>
                <Play className="w-3 h-3 mr-1" /> Reactivar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onResetPassword}>
              <Mail className="w-3 h-3 mr-1" /> Reset Contraseña
            </Button>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h4 className="text-sm font-medium mb-3">Actividad Reciente</h4>
            <ActivityTimeline userId={user.user_id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserDrawer;
