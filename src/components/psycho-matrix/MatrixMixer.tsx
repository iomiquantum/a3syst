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

const categoryDescriptions: Record<string, string> = {
  arquetipo: "🎯 ¿A quién le hablamos? Define el perfil psicológico de tu audiencia. Cada persona consume contenido de forma diferente según su motivación interna. Elige el arquetipo que mejor represente a tu paciente ideal.",
  vozMarca: "🗣️ ¿Cómo hablamos? La voz de marca define la personalidad con la que tu clínica se comunica. Es el tono, la actitud y el estilo que usarás en todo tu contenido. Piensa: si tu marca fuera una persona, ¿cómo hablaría?",
  disparador: "⚡ ¿Qué los mueve a actuar? Los disparadores de persuasión son principios psicológicos probados que impulsan a las personas a tomar decisiones. Elige el gatillo emocional que mejor active a tu audiencia.",
  generacion: "👥 ¿A qué generación pertenecen? Cada generación tiene valores, lenguaje y canales de comunicación distintos. Esto ajusta el mensaje para resonar culturalmente con tu público objetivo.",
  tecAvanzada: "🧠 Técnica psicológica avanzada (opcional). Son herramientas de influencia profunda basadas en PNL, psicología social y behavioral design. Úsalas con responsabilidad para potenciar el impacto de tu mensaje.",
};

function SelectorMatrix({ label, icon: Icon, options, value, onChange, opcional, categoryKey }: {
  label: string; icon: React.ElementType; options: MatrixOption[]; value: string; onChange: (v: string) => void; opcional?: boolean; categoryKey: string;
}) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {label}
          {opcional && <Badge variant="outline" className="text-[10px] ml-auto">Opcional</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {categoryDescriptions[categoryKey]}
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
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
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">Seleccionado: {options.find((o) => o.id === value)?.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {options.find((o) => o.id === value)?.description}
            </p>
          </div>
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

      {/* 5 selectores en vertical */}
      <div className="grid grid-cols-1 gap-4">
        <SelectorMatrix label="Arquetipo Objetivo" icon={Users} options={arquetiposDigitales} value={sel.arquetipo} onChange={(v) => setSel({ ...sel, arquetipo: v })} categoryKey="arquetipo" />
        <SelectorMatrix label="Voz de Marca" icon={Megaphone} options={arquetiposMarca} value={sel.vozMarca} onChange={(v) => setSel({ ...sel, vozMarca: v })} categoryKey="vozMarca" />
        <SelectorMatrix label="Disparador de Persuasión" icon={Brain} options={disparadoresPersuasion} value={sel.disparador} onChange={(v) => setSel({ ...sel, disparador: v })} categoryKey="disparador" />
        <SelectorMatrix label="Generación" icon={Users} options={codigosGeneracionales} value={sel.generacion} onChange={(v) => setSel({ ...sel, generacion: v })} categoryKey="generacion" />
        <SelectorMatrix label="Técnica Avanzada" icon={Skull} options={psicologiaAvanzada} value={sel.tecAvanzada} onChange={(v) => setSel({ ...sel, tecAvanzada: v })} opcional categoryKey="tecAvanzada" />
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
