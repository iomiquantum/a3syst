import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; phone: string; email?: string; notes?: string; source?: string }) => void;
}

const NewContactDialog = ({ open, onOpenChange, onCreate }: Props) => {
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", source: "call_center" });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    onCreate(form);
    setForm({ name: "", phone: "", email: "", notes: "", source: "call_center" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Nombre *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Teléfono *</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Email</Label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Fuente</Label>
            <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call_center">Call Center</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="web_widget">Sitio Web</SelectItem>
                <SelectItem value="referido">Referido</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Notas</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Información adicional..." />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.name.trim() || !form.phone.trim()}>
            Crear contacto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewContactDialog;
