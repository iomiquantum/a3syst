import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateEmpresaModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CreateEmpresaModal = ({ open, onOpenChange }: CreateEmpresaModalProps) => {
  const [form, setForm] = useState({ nombre: "", email_contacto: "", telefono: "" });
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { toast.error("Nombre es requerido"); return; }
    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) throw new Error("No autenticado");

      const { error } = await supabase.from("clinics").insert({
        name: form.nombre.trim(),
        owner_id: userId,
        description: "",
      } as any);
      if (error) throw error;

      toast.success("Empresa creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      onOpenChange(false);
      setForm({ nombre: "", email_contacto: "", telefono: "" });
    } catch (err: any) {
      toast.error(err.message || "Error al crear empresa");
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Empresa</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nombre de la empresa *</Label>
            <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Mi Empresa" maxLength={200} />
          </div>
          <div>
            <Label>Email de contacto</Label>
            <Input type="email" value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} placeholder="contacto@empresa.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+593..." />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={creating || !form.nombre.trim()}>
            {creating ? "Creando..." : "Crear Empresa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEmpresaModal;
