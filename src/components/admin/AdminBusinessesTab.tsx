import { useState } from "react";
import { Plus, Trash2, Building2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import BusinessTypeSelector, { BUSINESS_CATEGORIES } from "./BusinessTypeSelector";

interface AdminBusinessesTabProps {
  clinics: any[];
  roles: any[];
  onRefresh: () => void;
}

const AdminBusinessesTab = ({ clinics, roles, onRefresh }: AdminBusinessesTabProps) => {
  const { selectBusiness } = useBusiness();
  const { refresh: refreshLabels } = useBusinessLabels();
  const [businessOpen, setClinicOpen] = useState(false);
  const [businessForm, setClinicForm] = useState({ name: "", description: "", address: "", business_type: "" });
  const [personalizing, setPersonalizing] = useState<string | null>(null);

  const handleCreateClinic = async () => {
    if (!businessForm.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (!businessForm.business_type) { toast.error("Selecciona un tipo de negocio"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("businesses").insert({
      name: businessForm.name.trim(),
      description: businessForm.description.trim(),
      address: businessForm.address.trim(),
      owner_id: user.id,
      business_type: businessForm.business_type,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Negocio creado");
    setClinicOpen(false);
    setClinicForm({ name: "", description: "", address: "", business_type: "" });
    onRefresh();
  };

  const handleDeleteClinic = async (id: string) => {
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Negocio eliminado");
    onRefresh();
  };

  const handlePersonalize = async (clinic: any) => {
    setPersonalizing(clinic.id);
    try {
      const { data, error } = await supabase.functions.invoke("personalize-business", {
        body: { business_type: clinic.business_type || "general", business_name: clinic.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upsert labels
      const { error: upsertError } = await supabase
        .from("business_labels")
        .upsert({
          clinic_id: clinic.id,
          labels: data.labels,
          initial_services: data.initial_services || [],
          ai_generated: true,
        }, { onConflict: "clinic_id" });

      if (upsertError) throw upsertError;

      // Create initial services if any
      if (data.initial_services?.length > 0) {
        const services = data.initial_services.map((s: any) => ({
          clinic_id: clinic.id,
          name: s.name,
          duration: s.duration || 30,
          price: s.price || 0,
          description: s.description || "",
        }));
        await supabase.from("treatments").insert(services);
      }

      refreshLabels();
      toast.success("¡Negocio personalizado con IA! Labels y servicios iniciales creados.");
    } catch (e: any) {
      console.error("Personalize error:", e);
      toast.error(e.message || "Error al personalizar con IA");
    } finally {
      setPersonalizing(null);
    }
  };

  const getCategoryLabel = (type: string) => {
    const cat = BUSINESS_CATEGORIES.find(c => c.value === type);
    return cat ? `${cat.icon} ${cat.label}` : type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Negocios
        </h2>
        <Dialog open={businessOpen} onOpenChange={setClinicOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Negocio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Negocio</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Nombre *</Label><Input value={businessForm.name} onChange={e => setClinicForm({ ...businessForm, name: e.target.value })} maxLength={100} placeholder="Nombre del negocio" /></div>
              <BusinessTypeSelector value={businessForm.business_type} onChange={v => setClinicForm({ ...businessForm, business_type: v })} />
              <div><Label>Dirección</Label><Input value={businessForm.address} onChange={e => setClinicForm({ ...businessForm, address: e.target.value })} maxLength={300} /></div>
              <div><Label>Descripción</Label><Textarea value={businessForm.description} onChange={e => setClinicForm({ ...businessForm, description: e.target.value })} maxLength={500} /></div>
              <Button onClick={handleCreateClinic} className="w-full gradient-primary text-primary-foreground" disabled={!businessForm.name.trim() || !businessForm.business_type}>Crear Negocio</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clinics.map(c => (
          <Card key={c.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => selectBusiness(c.id, c.name)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteClinic(c.id); }} className="p-1.5 rounded-md hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {c.business_type && c.business_type !== "general" && (
                <Badge variant="secondary" className="mb-2 text-xs">{getCategoryLabel(c.business_type)}</Badge>
              )}
              {c.address && <p className="text-sm text-muted-foreground">{c.address}</p>}
              {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                {roles.filter(r => r.clinic_id === c.id).length} usuario(s) asignado(s)
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                disabled={personalizing === c.id}
                onClick={(e) => { e.stopPropagation(); handlePersonalize(c); }}
              >
                {personalizing === c.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Personalizando...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Personalizar con IA</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminBusinessesTab;
