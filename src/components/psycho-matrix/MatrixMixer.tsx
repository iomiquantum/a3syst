import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, type MatrixOption,
} from "@/lib/psychoMatrixData";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { Beaker, Brain, Megaphone, Users, Skull, Zap, Info, ArrowLeft } from "lucide-react";

export interface Seleccion {
  arquetipo: string;
  vozMarca: string;
  disparador: string;
  generacion: string;
  tecAvanzada: string;
}

interface Props {
  service: PsychoService;
  onGenerate: (sel: Seleccion) => void;
  onBack: () => void;
}

const etiquetaPrecio: Record<string, string> = { low: "Ticket Bajo", mid: "Ticket Medio", high: "Ticket Alto" };

function SelectorMatrix({ label, icon: Icon, options, value, onChange, opcional }: {
  label: string; icon: React.ElementType; options: MatrixOption[]; value: string; onChange: (v: string) => void; opcional?: boolean;
}) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {label}
          {opcional && <Badge variant="outline" className="text-[10px] ml-auto">Opcional</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {opcional && <SelectItem value="none">— Ninguno —</SelectItem>}
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex items-center gap-2">
                  <span>{opt.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px] text-xs">
                      {opt.description}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && value !== "none" && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {options.find((o) => o.id === value)?.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const MatrixMixer = ({ service, onGenerate, onBack }: Props) => {
  const [sel, setSel] = useState<Seleccion>({
    arquetipo: "", vozMarca: "", disparador: "", generacion: "", tecAvanzada: "",
  });

  const listo = sel.arquetipo && sel.vozMarca && sel.disparador && sel.generacion;

  return (
    <div className="space-y-6">
      {/* Encabezado del servicio */}
      <Card className="gradient-subtle border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Beaker className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">{service.name}</p>
            <p className="text-xs text-muted-foreground">{service.core_benefit} · {service.pain_point}</p>
          </div>
          <Badge variant="secondary">{etiquetaPrecio[service.target_price] || service.target_price}</Badge>
        </CardContent>
      </Card>

      {/* 5 selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SelectorMatrix label="Arquetipo Objetivo" icon={Users} options={arquetiposDigitales} value={sel.arquetipo} onChange={(v) => setSel({ ...sel, arquetipo: v })} />
        <SelectorMatrix label="Voz de Marca" icon={Megaphone} options={arquetiposMarca} value={sel.vozMarca} onChange={(v) => setSel({ ...sel, vozMarca: v })} />
        <SelectorMatrix label="Disparador de Persuasión" icon={Brain} options={disparadoresPersuasion} value={sel.disparador} onChange={(v) => setSel({ ...sel, disparador: v })} />
        <SelectorMatrix label="Generación" icon={Users} options={codigosGeneracionales} value={sel.generacion} onChange={(v) => setSel({ ...sel, generacion: v })} />
        <SelectorMatrix label="Técnica Avanzada" icon={Skull} options={psicologiaAvanzada} value={sel.tecAvanzada} onChange={(v) => setSel({ ...sel, tecAvanzada: v })} opcional />
      </div>

      {/* Botón generar */}
      <Button onClick={() => onGenerate(sel)} disabled={!listo} className="w-full h-12 gradient-primary text-primary-foreground text-base font-semibold" size="lg">
        <Zap className="w-5 h-5 mr-2" />
        Generar Perfil de Estrategia
      </Button>
    </div>
  );
};

export default MatrixMixer;
