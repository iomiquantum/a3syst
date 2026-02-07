import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialProfessionals = [
  { id: 1, name: "Dr. Juan Pérez", email: "juan@clinica.com", phone: "+54 11 1234-5678", specialty: "Odontología", branch: "Sede Central", initials: "JP" },
  { id: 2, name: "Dra. Laura Gómez", email: "laura@clinica.com", phone: "+54 11 2345-6789", specialty: "Dermatología", branch: "Sede Central", initials: "LG" },
  { id: 3, name: "Dr. Martín Rodríguez", email: "martin@clinica.com", phone: "+54 11 3456-7890", specialty: "Medicina general", branch: "Sucursal Norte", initials: "MR" },
  { id: 4, name: "Dra. Sofía Hernández", email: "sofia@clinica.com", phone: "+54 11 4567-8901", specialty: "Estética", branch: "Sede Central", initials: "SH" },
];

const ProfesionalesPage = () => {
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", specialty: "", branch: "" });

  const handleSave = () => {
    const names = form.name.split(" ");
    const initials = names.length >= 2 ? `${names[0][0]}${names[names.length-1][0]}`.toUpperCase() : form.name.substring(0,2).toUpperCase();
    setProfessionals([...professionals, { id: Date.now(), ...form, initials }]);
    setOpen(false);
    setForm({ name: "", email: "", phone: "", specialty: "", branch: "" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profesionales</h1>
            <p className="text-muted-foreground">Gestiona los profesionales de tu clínica</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Profesional
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Profesional</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Nombre completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Especialidad *</Label>
                    <Select value={form.specialty} onValueChange={v => setForm({...form, specialty: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {["Dermatología","Odontología","Medicina general","Kinesiología","Estética"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sucursal *</Label>
                    <Select value={form.branch} onValueChange={v => setForm({...form, branch: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sede Central">Sede Central</SelectItem>
                        <SelectItem value="Sucursal Norte">Sucursal Norte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.name || !form.email || !form.specialty || !form.branch}>Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Profesional</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Especialidad</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Sucursal</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-foreground">{p.initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{p.specialty}</span></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.branch}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-md hover:bg-muted"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => setProfessionals(professionals.filter(x => x.id !== p.id))} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
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

export default ProfesionalesPage;
