import { Stethoscope, DollarSign, MapPin, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AIAgentConfig } from "@/hooks/useAIAgentConfig";

interface HealthBusinessFieldsProps {
  config: AIAgentConfig;
  onUpdate: <K extends keyof AIAgentConfig>(key: K, value: AIAgentConfig[K]) => void;
}

const HealthBusinessFields = ({ config, onUpdate }: HealthBusinessFieldsProps) => {
  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" /> Información del Negocio
        </CardTitle>
        <CardDescription>Datos específicos de tu clínica que el agente usará para responder.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Treatments */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
              Tratamientos / Servicios Disponibles
            </Label>
            <Textarea
              value={config.treatments_text}
              onChange={(e) => onUpdate("treatments_text", e.target.value)}
              rows={6}
              placeholder="Lista los tratamientos o servicios principales (uno por línea). Ej: Limpieza dental, Consulta general, etc."
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lista los tratamientos o servicios principales (uno por línea). Ej: Limpieza dental, Consulta general, etc.
            </p>
          </div>

          {/* Prices */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              Precios o Rangos de Precios
            </Label>
            <Textarea
              value={config.prices_text}
              onChange={(e) => onUpdate("prices_text", e.target.value)}
              rows={6}
              placeholder="Precios estimados o rangos (uno por línea). Ej: Consulta: $500-800, Limpieza: $1200"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Precios estimados o rangos (uno por línea). Ej: Consulta: $500-800, Limpieza: $1200
            </p>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Ubicaciones / Sucursales
            </Label>
            <Textarea
              value={config.locations_text}
              onChange={(e) => onUpdate("locations_text", e.target.value)}
              rows={4}
              placeholder="Direcciones de las sucursales (una por línea). Ej: Av. Principal 123, Centro"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Direcciones de las sucursales (una por línea). Ej: Av. Principal 123, Centro
            </p>
          </div>

          {/* Professionals */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Profesionales / Especialistas
            </Label>
            <Textarea
              value={config.professionals_text}
              onChange={(e) => onUpdate("professionals_text", e.target.value)}
              rows={4}
              placeholder="Nombres y especialidades de los profesionales (uno por línea). Ej: Dr. García - Odontología"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Nombres y especialidades de los profesionales (uno por línea). Ej: Dr. García - Odontología
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthBusinessFields;
