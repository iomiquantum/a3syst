import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { roleLabelsAdmin, roleColors, UsuarioCompleto } from "@/hooks/useUsuariosAdmin";

interface ChangeRoleModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UsuarioCompleto | null;
  roleId: string;
  currentRole: string;
  onSubmit: (newRole: string, reason: string) => void;
  isLoading: boolean;
}

const ChangeRoleModal = ({ open, onOpenChange, user, roleId, currentRole, onSubmit, isLoading }: ChangeRoleModalProps) => {
  const [newRole, setNewRole] = useState(currentRole);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onSubmit(newRole, reason);
    setReason("");
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cambiar Rol</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-medium">{user.full_name} {user.apellido}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div>
            <Label>Rol actual</Label>
            <div className="mt-1">
              <Badge className={roleColors[currentRole] || "bg-muted"}>
                {roleLabelsAdmin[currentRole] || currentRole}
              </Badge>
            </div>
          </div>
          <div>
            <Label>Nuevo rol *</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabelsAdmin).filter(([k]) => k !== "super_admin").map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Razón del cambio</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Opcional..." rows={2} maxLength={500} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={newRole === currentRole || isLoading}>
            {isLoading ? "Cambiando..." : "Confirmar Cambio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeRoleModal;
