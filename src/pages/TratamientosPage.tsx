import { useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialTreatments = [
  { id: 1, name: "Limpieza dental", duration: 30, description: "Limpieza profesional", price: 5000 },
  { id: 2, name: "Consulta general", duration: 20, description: "Consulta médica general", price: 3000 },
  { id: 3, name: "Blanqueamiento", duration: 60, description: "Blanqueamiento dental profesional", price: 15000 },
  { id: 4, name: "Control anual", duration: 30, description: "Control médico anual", price: 4000 },
  { id: 5, name: "Extracción", duration: 45, description: "Extracción dental simple", price: 8000 },
];

const initialSpecialties = [
  { id: 1, name: "Dermatología" },
  { id: 2, name: "Odontología" },
  { id: 3, name: "Medicina general" },
  { id: 4, name: "Kinesiología" },
  { id: 5, name: "Estética" },
];

const TratamientosPage = () => {
  const [treatments, setTreatments] = useState(initialTreatments);
  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [openTreatment, setOpenTreatment] = useState(false);
  const [openSpecialty, setOpenSpecialty] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ name: "", duration: "", description: "", price: "" });
  const [specialtyName, setSpecialtyName] = useState("");

  const handleSaveTreatment = () => {
    setTreatments([...treatments, { id: Date.now(), name: treatmentForm.name, duration: parseInt(treatmentForm.duration), description: treatmentForm.description, price: parseFloat(treatmentForm.price) }]);
    setOpenTreatment(false);
    setTreatmentForm({ name: "", duration: "", description: "", price: "" });
  };

  const handleSaveSpecialty = () => {
    setSpecialties([...specialties, { id: Date.now(), name: specialtyName }]);
    setOpenSpecialty(false);
    setSpecialtyName("");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tratamientos y Especialidades</h1>
          <p className="text-muted-foreground">Configura los servicios de tu clínica</p>
        </div>

        <Tabs defaultValue="tratamientos">
          <TabsList>
            <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>
            <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
          </TabsList>

          <TabsContent value="tratamientos" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={openTreatment} onOpenChange={setOpenTreatment}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Tratamiento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuevo Tratamiento</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nombre *</Label><Input value={treatmentForm.name} onChange={e => setTreatmentForm({...treatmentForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Duración (min) *</Label><Input type="number" value={treatmentForm.duration} onChange={e => setTreatmentForm({...treatmentForm, duration: e.target.value})} /></div>
                      <div><Label>Precio</Label><Input type="number" value={treatmentForm.price} onChange={e => setTreatmentForm({...treatmentForm, price: e.target.value})} /></div>
                    </div>
                    <div><Label>Descripción</Label><Textarea value={treatmentForm.description} onChange={e => setTreatmentForm({...treatmentForm, description: e.target.value})} /></div>
                    <Button onClick={handleSaveTreatment} className="w-full gradient-primary text-primary-foreground" disabled={!treatmentForm.name || !treatmentForm.duration}>Crear</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Tratamiento</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Duración</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Precio</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Descripción</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map(t => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.name}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" /> {t.duration} min
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground">${t.price.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.description}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                            <button onClick={() => setTreatments(treatments.filter(x => x.id !== t.id))} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="especialidades" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={openSpecialty} onOpenChange={setOpenSpecialty}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" /> Nueva Especialidad
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nueva Especialidad</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nombre *</Label><Input value={specialtyName} onChange={e => setSpecialtyName(e.target.value)} placeholder="Ej: Dermatología" /></div>
                    <Button onClick={handleSaveSpecialty} className="w-full gradient-primary text-primary-foreground" disabled={!specialtyName}>Crear</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {specialties.map(s => (
                <Card key={s.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setSpecialties(specialties.filter(x => x.id !== s.id))} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TratamientosPage;
