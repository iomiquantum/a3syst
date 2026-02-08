import { useState } from "react";
import { Users, Plus, Filter, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Audience {
  id: string;
  name: string;
  type: "dinámica" | "estática";
  count: number;
  filters: string[];
}

const mockAudiences: Audience[] = [
  { id: "1", name: "Todos los contactos", type: "dinámica", count: 1248, filters: ["Sin filtro"] },
  { id: "2", name: "Leads nuevos (última semana)", type: "dinámica", count: 45, filters: ["Etapa: Nuevos", "Creado: últimos 7 días"] },
  { id: "3", name: "Pacientes sin cita > 6 meses", type: "dinámica", count: 132, filters: ["Es paciente", "Última cita > 180 días"] },
  { id: "4", name: "Interesados en ortodoncia", type: "estática", count: 67, filters: ["Tag: ortodoncia"] },
];

const AudienciasTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Segmenta tus contactos en audiencias para campañas dirigidas.</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva audiencia
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mockAudiences.map((a) => (
          <Card key={a.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.count} contactos</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {a.type}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {a.filters.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px]">
                    <Filter className="w-2.5 h-2.5 mr-1" />
                    {f}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva audiencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Leads interesados en implantes" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="dinámica">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinámica">Dinámica (se actualiza automáticamente)</SelectItem>
                  <SelectItem value="estática">Estática (selección manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtro por etapa</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Cualquier etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevos">Nuevos</SelectItem>
                  <SelectItem value="contactado">Contactado</SelectItem>
                  <SelectItem value="interesado">Interesado</SelectItem>
                  <SelectItem value="cita_agendada">Cita agendada</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtro por tag</Label>
              <Input placeholder="Ej: ortodoncia, blanqueamiento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setDialogOpen(false)}>Crear audiencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudienciasTab;
