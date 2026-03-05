import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { roleLabelsAdmin } from "@/hooks/useUsuariosAdmin";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinics: { id: string; name: string }[];
  onSubmit: (form: { nombre: string; apellido: string; email: string; telefono: string; clinic_id: string; role: string; notas: string; password: string }) => void;
  isLoading: boolean;
}

const CreateUserModal = ({ open, onOpenChange, clinics, onSubmit, isLoading }: CreateUserModalProps) => {
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", clinic_id: "", role: "empleado", notas: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ nombre: "", apellido: "", email: "", telefono: "", clinic_id: "", role: "empleado", notas: "", password: "" });
  };

  const valid = form.nombre.trim() && form.apellido.trim() && form.email.trim() && form.password.length >= 6 && form.clinic_id && form.role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Crear Nuevo Usuario</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" maxLength={100} />
            </div>
            <div>
              <Label>Apellido *</Label>
              <Input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" maxLength={100} />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" maxLength={255} />
          </div>
          <div>
            <Label>Contraseña *</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+593..." maxLength={30} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Empresa *</Label>
              <Select value={form.clinic_id} onValueChange={v => setForm({ ...form, clinic_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabelsAdmin).filter(([k]) => k !== "super_admin").map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Notas sobre este usuario..." rows={2} maxLength={1000} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!valid || isLoading}>
            {isLoading ? "Creando..." : "Crear Usuario"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
