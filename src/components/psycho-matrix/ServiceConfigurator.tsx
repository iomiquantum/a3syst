import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateService, usePsychoServices, type PsychoService } from "@/hooks/usePsychoMatrix";
import { Plus, Sparkles, ChevronRight, Beaker, DollarSign } from "lucide-react";

const etiquetaPrecio: Record<string, string> = {
  low: "Ticket Bajo",
  mid: "Ticket Medio",
  high: "Ticket Alto",
};

interface Props {
  onSelectService: (svc: PsychoService) => void;
}

const ServiceConfigurator = ({ onSelectService }: Props) => {
  const { data: services = [], isLoading } = usePsychoServices();
  const createService = useCreateService();
  const [form, setForm] = useState({
    name: "",
    core_benefit: "",
    pain_point: "",
    target_price: "mid",
    price: "",
    observations: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const result = await createService.mutateAsync({
      name: form.name,
      core_benefit: form.core_benefit,
      pain_point: form.pain_point,
      target_price: form.target_price,
      price: form.price ? parseFloat(form.price) : 0,
      observations: form.observations,
    });
    setForm({ name: "", core_benefit: "", pain_point: "", target_price: "mid", price: "", observations: "" });
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
            Registrar Servicio / Producto
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Crea un servicio o producto con todos sus atributos para mezclarlo en el Mixer y generar estrategias de marketing psicológicas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Name + Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Servicio / Producto *</Label>
              <Input
                placeholder='Ej: "Sueroterapia Vitamina C", "Blanqueamiento Dental"'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                Precio (opcional)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Ej: 250.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>

          {/* Row 2: Price Range */}
          <div className="space-y-2">
            <Label>Rango de Precio (opcional)</Label>
            <Select value={form.target_price} onValueChange={(v) => setForm({ ...form, target_price: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Ticket Bajo — Accesible, alto volumen</SelectItem>
                <SelectItem value="mid">🟡 Ticket Medio — Equilibrio calidad/precio</SelectItem>
                <SelectItem value="high">🔴 Ticket Alto — Premium, exclusivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Core benefit */}
          <div className="space-y-2">
            <Label>Beneficio Principal *</Label>
            <Input
              placeholder='Ej: "Refuerzo del sistema inmune y anti-aging", "Sonrisa más blanca en 1 sesión"'
              value={form.core_benefit}
              onChange={(e) => setForm({ ...form, core_benefit: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">¿Cuál es la transformación principal que obtiene el paciente/cliente?</p>
          </div>

          {/* Row 4: Pain point */}
          <div className="space-y-2">
            <Label>Punto de Dolor *</Label>
            <Textarea
              placeholder='Ej: "Fatiga crónica, sistema inmune debilitado, aspecto envejecido"'
              value={form.pain_point}
              onChange={(e) => setForm({ ...form, pain_point: e.target.value })}
              className="min-h-[60px]"
            />
            <p className="text-[10px] text-muted-foreground">¿Qué problema o frustración resuelve este servicio?</p>
          </div>

          {/* Row 5: Observations */}
          <div className="space-y-2">
            <Label>Observaciones adicionales (opcional)</Label>
            <Textarea
              placeholder='Ej: "Incluye 3 sesiones, ideal para pacientes post-cirugía, requiere evaluación previa, competencia: Negocio X cobra $500 por lo mismo"'
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="min-h-[80px]"
            />
            <p className="text-[10px] text-muted-foreground">Cualquier dato extra relevante: competencia, temporalidad, restricciones, público específico, etc.</p>
          </div>

          <Button onClick={handleCreate} disabled={!form.name.trim() || createService.isPending} className="w-full gradient-primary text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            {createService.isPending ? "Creando..." : "Crear Servicio / Producto"}
          </Button>
        </CardContent>
      </Card>

      {services.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Servicios / Productos Registrados ({services.length})
          </h3>
          <div className="grid gap-3">
            {services.map((svc) => (
              <Card key={svc.id} className="cursor-pointer hover:border-primary/40 hover:shadow-card-hover transition-all group" onClick={() => onSelectService(svc)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Beaker className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{svc.name}</p>
                        {svc.price > 0 && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">${svc.price}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{svc.core_benefit || "Sin beneficio definido"}</p>
                      {svc.pain_point && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">Dolor: {svc.pain_point}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{etiquetaPrecio[svc.target_price] || svc.target_price}</Badge>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
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
