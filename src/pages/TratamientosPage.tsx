import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { treatmentSchema, specialtySchema, getValidationError } from "@/lib/validations";

const TratamientosPage = () => {
  const { clinicId } = useClinic();
  const { labels } = useBusinessLabels();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [openTreatment, setOpenTreatment] = useState(false);
  const [openSpecialty, setOpenSpecialty] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ name: "", duration: "", description: "", price: "" });
  const [specialtyName, setSpecialtyName] = useState("");

  const fetchData = async () => {
    if (!clinicId) return;
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("treatments").select("*").eq("clinic_id", clinicId).order("created_at"),
      supabase.from("specialties").select("*").eq("clinic_id", clinicId).order("created_at"),
    ]);
    setTreatments(t || []);
    setSpecialties(s || []);
  };

  useEffect(() => { fetchData(); }, [clinicId]);

  const handleSaveTreatment = async () => {
    if (!clinicId) return;
    try {
      const validated = treatmentSchema.parse({
        name: treatmentForm.name,
        duration: parseInt(treatmentForm.duration) || 0,
        price: parseFloat(treatmentForm.price) || 0,
        description: treatmentForm.description,
      });
      const { error } = await supabase.from("treatments").insert({
        clinic_id: clinicId, name: validated.name, duration: validated.duration,
        description: validated.description || "", price: validated.price,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`${labels.treatments_singular} creado`);
      setOpenTreatment(false); setTreatmentForm({ name: "", duration: "", description: "", price: "" });
      fetchData();
    } catch (e) {
      toast.error(getValidationError(e));
    }
  };

  const handleSaveSpecialty = async () => {
    if (!clinicId) return;
    try {
      const validated = specialtySchema.parse({ name: specialtyName });
      const { error } = await supabase.from("specialties").insert({ clinic_id: clinicId, name: validated.name });
      if (error) { toast.error(error.message); return; }
      toast.success("Categoría creada");
      setOpenSpecialty(false); setSpecialtyName("");
      fetchData();
    } catch (e) {
      toast.error(getValidationError(e));
    }
  };

  const deleteTreatment = async (id: string) => {
    await supabase.from("treatments").delete().eq("id", id);
    toast.success(`${labels.treatments_singular} eliminado`); fetchData();
  };

  const deleteSpecialty = async (id: string) => {
    await supabase.from("specialties").delete().eq("id", id);
    toast.success("Categoría eliminada"); fetchData();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{labels.treatments} y {labels.specialties}</h1>
          <p className="text-muted-foreground">Configura los {labels.treatments.toLowerCase()} de tu negocio</p>
        </div>

        <Tabs defaultValue="tratamientos">
          <TabsList><TabsTrigger value="tratamientos">{labels.treatments}</TabsTrigger><TabsTrigger value="especialidades">{labels.specialties}</TabsTrigger></TabsList>

          <TabsContent value="tratamientos" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={openTreatment} onOpenChange={setOpenTreatment}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nuevo {labels.treatments_singular}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuevo {labels.treatments_singular}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nombre *</Label><Input value={treatmentForm.name} onChange={e => setTreatmentForm({...treatmentForm, name: e.target.value})} maxLength={100} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Duración (min) *</Label><Input type="number" value={treatmentForm.duration} onChange={e => setTreatmentForm({...treatmentForm, duration: e.target.value})} min={1} max={480} /></div>
                      <div><Label>Precio</Label><Input type="number" value={treatmentForm.price} onChange={e => setTreatmentForm({...treatmentForm, price: e.target.value})} min={0} /></div>
                    </div>
                    <div><Label>Descripción</Label><Textarea value={treatmentForm.description} onChange={e => setTreatmentForm({...treatmentForm, description: e.target.value})} maxLength={1000} /></div>
                    <Button onClick={handleSaveTreatment} className="w-full gradient-primary text-primary-foreground" disabled={!treatmentForm.name || !treatmentForm.duration}>Crear</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-card">
              <CardContent className="p-0">
                {treatments.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">No hay {labels.treatments.toLowerCase()} creados aún.</p>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{labels.treatments_singular}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Duración</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Precio</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Descripción</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                    </tr></thead>
                    <tbody>
                      {treatments.map(t => (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.name}</td>
                          <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {t.duration} min</div></td>
                          <td className="px-5 py-3.5 text-sm text-foreground">${Number(t.price).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.description}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                              <button onClick={() => deleteTreatment(t.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="especialidades" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={openSpecialty} onOpenChange={setOpenSpecialty}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nueva Categoría</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nueva Categoría</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nombre *</Label><Input value={specialtyName} onChange={e => setSpecialtyName(e.target.value)} placeholder="Ej: Marketing Digital" maxLength={100} /></div>
                    <Button onClick={handleSaveSpecialty} className="w-full gradient-primary text-primary-foreground" disabled={!specialtyName}>Crear</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {specialties.length === 0 ? (
              <Card className="shadow-card"><CardContent className="p-8 text-center"><p className="text-muted-foreground">No hay {labels.specialties.toLowerCase()} creadas aún.</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {specialties.map(s => (
                  <Card key={s.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <button onClick={() => deleteSpecialty(s.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TratamientosPage;
