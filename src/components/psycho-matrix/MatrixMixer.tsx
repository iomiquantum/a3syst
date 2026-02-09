import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, type MatrixOption,
} from "@/lib/psychoMatrixData";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Beaker, Brain, Megaphone, Users, Skull, Zap, ArrowLeft, Sparkles, RefreshCw, Mic, MicOff, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Seleccion {
  arquetipo: string;
  vozMarca: string;
  disparador: string;
  generacion: string;
  tecAvanzada: string;
  customNotes: string;
}

interface Props {
  service: PsychoService;
  onGenerate: (sel: Seleccion) => void;
  onBack: () => void;
}

const etiquetaPrecio: Record<string, string> = { low: "Ticket Bajo", mid: "Ticket Medio", high: "Ticket Alto" };

const categoryDescriptions: Record<string, string> = {
  arquetipo: "🎯 ¿A quién le hablamos? Elige el perfil psicológico de tu paciente ideal. Cada persona consume contenido de forma diferente según su motivación interna.",
  vozMarca: "🗣️ ¿Cómo hablamos? La voz de marca es la personalidad con la que tu clínica se comunica. Si tu marca fuera una persona, ¿cómo hablaría?",
  disparador: "⚡ ¿Qué los mueve a actuar? Son principios psicológicos probados que impulsan a tomar decisiones. Elige el gatillo emocional que mejor active a tu audiencia.",
  generacion: "👥 ¿A qué generación pertenecen? Cada generación tiene valores y lenguaje distintos. Esto ajusta el mensaje para resonar con tu público.",
  tecAvanzada: "🧠 Técnica avanzada (opcional). Herramientas de influencia profunda basadas en PNL y psicología social. Úsalas con responsabilidad.",
};

function CheckboxCategory({ label, icon: Icon, options, value, onChange, opcional, categoryKey }: {
  label: string; icon: React.ElementType; options: MatrixOption[]; value: string; onChange: (v: string) => void; opcional?: boolean; categoryKey: string;
}) {
  const handleToggle = (optionId: string) => {
    if (value === optionId) {
      if (opcional) onChange("");
    } else {
      onChange(optionId);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 pt-4 px-5">
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
      <CardContent className="px-5 pb-4 space-y-2">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => handleToggle(opt.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(opt.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {opt.description}
                </p>
                <p className="text-xs italic text-muted-foreground/70 mt-1">
                  Ejemplo: {opt.example}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const MatrixMixer = ({ service, onGenerate, onBack }: Props) => {
  const [sel, setSel] = useState<Seleccion>({
    arquetipo: "", vozMarca: "", disparador: "", generacion: "", tecAvanzada: "", customNotes: "",
  });
  const [magicUsed, setMagicUsed] = useState(false);

  const handleVoiceResult = useCallback((transcript: string) => {
    setSel(prev => ({ ...prev, customNotes: prev.customNotes ? `${prev.customNotes} ${transcript}` : transcript }));
  }, []);
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({ onResult: handleVoiceResult });

  const randomPick = (opts: MatrixOption[]) => opts[Math.floor(Math.random() * opts.length)].id;

  const hacerMagia = useCallback(() => {
    setSel(prev => ({
      ...prev,
      arquetipo: randomPick(arquetiposDigitales),
      vozMarca: randomPick(arquetiposMarca),
      disparador: randomPick(disparadoresPersuasion),
      generacion: randomPick(codigosGeneracionales),
      tecAvanzada: Math.random() > 0.4 ? randomPick(psicologiaAvanzada) : "",
    }));
    setMagicUsed(true);
  }, []);

  // Allow generation if either categories are filled OR custom notes exist
  const hasCategories = sel.arquetipo && sel.vozMarca && sel.disparador && sel.generacion;
  const hasCustom = sel.customNotes.trim().length > 0;
  const listo = hasCategories || hasCustom;

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

      {/* Custom strategy notes with voice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PenLine className="w-4 h-4 text-primary" />
            </div>
            Personalización libre
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            ✍️ Escribe o dicta con tu voz tu propia estrategia personalizada. Puedes usar esto en lugar de las opciones de abajo, o como complemento adicional.
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="relative">
            <Textarea
              placeholder="Ej: Quiero una estrategia enfocada en mamás jóvenes que buscan tratamientos de ortodoncia invisible, con un tono aspiracional y urgencia por promoción de temporada..."
              className="min-h-[100px] pr-12"
              value={sel.customNotes}
              onChange={e => setSel({ ...sel, customNotes: e.target.value })}
            />
            {voiceSupported && (
              <Button
                type="button"
                variant={isListening ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full transition-all",
                  isListening && "bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse"
                )}
                onClick={toggleListening}
                title={isListening ? "Detener grabación" : "Dictar con voz"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>
          {isListening && (
            <p className="text-xs text-destructive font-medium animate-pulse mt-1.5">🎙️ Escuchando… habla y tu texto aparecerá aquí</p>
          )}
        </CardContent>
      </Card>

      {/* Hacer Magia + Abra cadabra */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <Button onClick={hacerMagia} className="gradient-primary text-primary-foreground gap-2">
          <Sparkles className="w-4 h-4" />
          ✨ Hacer magia
        </Button>
        {magicUsed && (
          <Button variant="outline" onClick={hacerMagia} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <RefreshCw className="w-4 h-4" />
            Abra cadabra
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-1">Déjanos a nosotros hacer la magia ✨</p>
      </div>

      {/* 5 categorías en vertical con checkboxes */}
      <div className="grid grid-cols-1 gap-4">
        <CheckboxCategory label="Arquetipo Objetivo" icon={Users} options={arquetiposDigitales} value={sel.arquetipo} onChange={(v) => setSel({ ...sel, arquetipo: v })} categoryKey="arquetipo" />
        <CheckboxCategory label="Voz de Marca" icon={Megaphone} options={arquetiposMarca} value={sel.vozMarca} onChange={(v) => setSel({ ...sel, vozMarca: v })} categoryKey="vozMarca" />
        <CheckboxCategory label="Disparador de Persuasión" icon={Brain} options={disparadoresPersuasion} value={sel.disparador} onChange={(v) => setSel({ ...sel, disparador: v })} categoryKey="disparador" />
        <CheckboxCategory label="Generación" icon={Users} options={codigosGeneracionales} value={sel.generacion} onChange={(v) => setSel({ ...sel, generacion: v })} categoryKey="generacion" />
        <CheckboxCategory label="Técnica Avanzada" icon={Skull} options={psicologiaAvanzada} value={sel.tecAvanzada} onChange={(v) => setSel({ ...sel, tecAvanzada: v })} opcional categoryKey="tecAvanzada" />
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
