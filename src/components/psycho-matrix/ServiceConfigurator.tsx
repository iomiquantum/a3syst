import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateService, usePsychoServices, type PsychoService } from "@/hooks/usePsychoMatrix";
import { Plus, Sparkles, ChevronRight, Beaker } from "lucide-react";

interface Props {
  onSelectService: (svc: PsychoService) => void;
}

const ServiceConfigurator = ({ onSelectService }: Props) => {
  const { data: services = [], isLoading } = usePsychoServices();
  const createService = useCreateService();
  const [form, setForm] = useState({ name: "", core_benefit: "", pain_point: "", target_price: "mid" });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const result = await createService.mutateAsync(form);
    setForm({ name: "", core_benefit: "", pain_point: "", target_price: "mid" });
    onSelectService(result);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary-foreground" />
            </div>
            Registrar Servicio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Servicio</Label>
              <Input placeholder='Ej: "Sueroterapia Vitamina C"' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rango de Precio</Label>
              <Select value={form.target_price} onValueChange={(v) => setForm({ ...form, target_price: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Ticket Bajo</SelectItem>
                  <SelectItem value="mid">Ticket Medio</SelectItem>
                  <SelectItem value="high">Ticket Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Beneficio Principal</Label>
            <Input placeholder='Ej: "Refuerzo del sistema inmune y anti-aging"' value={form.core_benefit} onChange={(e) => setForm({ ...form, core_benefit: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Punto de Dolor</Label>
            <Textarea placeholder='Ej: "Fatiga crónica, sistema inmune debilitado"' value={form.pain_point} onChange={(e) => setForm({ ...form, pain_point: e.target.value })} className="min-h-[60px]" />
          </div>
          <Button onClick={handleCreate} disabled={!form.name.trim() || createService.isPending} className="w-full gradient-primary text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            {createService.isPending ? "Creando..." : "Crear Servicio"}
          </Button>
        </CardContent>
      </Card>

      {services.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Servicios Registrados</h3>
          <div className="grid gap-3">
            {services.map((svc) => (
              <Card key={svc.id} className="cursor-pointer hover:border-primary/40 hover:shadow-card-hover transition-all group" onClick={() => onSelectService(svc)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Beaker className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.core_benefit || "Sin beneficio definido"}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground text-center">Cargando servicios...</p>}
    </div>
  );
};

export default ServiceConfigurator;
