import { useState } from "react";
import { Search, Plus, MoreHorizontal, Phone, Mail, Upload, Download, Pencil, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialPatients = [
  { id: 1, name: "María", lastName: "García", email: "maria@email.com", phone: "+52 555 123 4567", age: 34, dob: "1991-03-15", document: "12345678", lastVisit: "2025-02-05", status: "Activo", notes: "", initials: "MG" },
  { id: 2, name: "Carlos", lastName: "López", email: "carlos@email.com", phone: "+52 555 234 5678", age: 45, dob: "1980-07-22", document: "23456789", lastVisit: "2025-02-04", status: "Activo", notes: "", initials: "CL" },
  { id: 3, name: "Ana", lastName: "Martínez", email: "ana@email.com", phone: "+52 555 345 6789", age: 28, dob: "1997-01-10", document: "34567890", lastVisit: "2025-02-03", status: "Activo", notes: "Alergia a penicilina", initials: "AM" },
  { id: 4, name: "Roberto", lastName: "Díaz", email: "roberto@email.com", phone: "+52 555 456 7890", age: 52, dob: "1973-11-30", document: "45678901", lastVisit: "2025-02-02", status: "Inactivo", notes: "", initials: "RD" },
  { id: 5, name: "Lucía", lastName: "Fernández", email: "lucia@email.com", phone: "+52 555 567 8901", age: 39, dob: "1986-05-18", document: "56789012", lastVisit: "2025-01-28", status: "Activo", notes: "", initials: "LF" },
  { id: 6, name: "Pedro", lastName: "Sánchez", email: "pedro@email.com", phone: "+52 555 678 9012", age: 61, dob: "1964-09-05", document: "67890123", lastVisit: "2025-01-25", status: "Activo", notes: "Hipertenso", initials: "PS" },
  { id: 7, name: "Carmen", lastName: "Ruiz", email: "carmen@email.com", phone: "+52 555 789 0123", age: 43, dob: "1982-12-01", document: "78901234", lastVisit: "2025-01-20", status: "Inactivo", notes: "", initials: "CR" },
  { id: 8, name: "Diego", lastName: "Torres", email: "diego@email.com", phone: "+52 555 890 1234", age: 37, dob: "1988-04-25", document: "89012345", lastVisit: "2025-01-18", status: "Activo", notes: "", initials: "DT" },
];

const PacientesPage = () => {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState(initialPatients);
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<typeof initialPatients[0] | null>(null);
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", dob: "", document: "", notes: "" });

  const filtered = patients.filter(
    (p) =>
      `${p.name} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.document.includes(search)
  );

  const handleSave = () => {
    const initials = `${form.name[0]}${form.lastName[0]}`.toUpperCase();
    if (editingPatient) {
      setPatients(patients.map(p => p.id === editingPatient.id ? { ...p, ...form, initials } : p));
    } else {
      setPatients([...patients, { id: Date.now(), ...form, age: 0, lastVisit: new Date().toISOString().split("T")[0], status: "Activo", initials }]);
    }
    setOpen(false);
    setEditingPatient(null);
    setForm({ name: "", lastName: "", email: "", phone: "", dob: "", document: "", notes: "" });
  };

  const handleEdit = (p: typeof initialPatients[0]) => {
    setEditingPatient(p);
    setForm({ name: p.name, lastName: p.lastName, email: p.email, phone: p.phone, dob: p.dob, document: p.document, notes: p.notes });
    setOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">Gestiona tu lista de pacientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar CSV</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Descargar Plantilla</Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingPatient(null); setForm({ name: "", lastName: "", email: "", phone: "", dob: "", document: "", notes: "" }); } }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingPatient ? "Editar Paciente" : "Nuevo Paciente"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                    <div><Label>Apellido *</Label><Input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
                  </div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><Label>Documento/RUT</Label><Input value={form.document} onChange={e => setForm({...form, document: e.target.value})} /></div>
                  </div>
                  <div><Label>Fecha de nacimiento</Label><Input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} /></div>
                  <div><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Alergias, condiciones especiales..." /></div>
                  <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.name || !form.lastName || !form.email}>
                    {editingPatient ? "Guardar Cambios" : "Crear Paciente"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre, email o documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-background h-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Documento</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Última Visita</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient) => (
                    <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary-foreground">{patient.initials}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{patient.name} {patient.lastName}</p>
                            <p className="text-xs text-muted-foreground">{patient.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{patient.document}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          <button className="p-1.5 rounded-md hover:bg-muted"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{patient.lastVisit}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${patient.status === "Activo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{patient.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(patient)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                          <button onClick={() => setPatients(patients.filter(x => x.id !== patient.id))} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PacientesPage;
