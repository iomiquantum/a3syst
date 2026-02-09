import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, construirPrompt,
} from "@/lib/psychoMatrixData";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { useSaveStrategy } from "@/hooks/usePsychoMatrix";
import type { Seleccion } from "@/components/psycho-matrix/MatrixMixer";
import { Copy, Save, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  service: PsychoService;
  selection: Seleccion;
  onBack: () => void;
}

function buscarOpcion(lista: { id: string; label: string; description: string }[], id: string) {
  return lista.find((i) => i.id === id);
}

const StrategyCard = ({ service, selection, onBack }: Props) => {
  const { toast } = useToast();
  const guardarEstrategia = useSaveStrategy();
  const [nombreEstrategia, setNombreEstrategia] = useState(`Estrategia ${service.name}`);
  const [copiado, setCopiado] = useState(false);

  const arq = buscarOpcion(arquetiposDigitales, selection.arquetipo);
  const marca = buscarOpcion(arquetiposMarca, selection.vozMarca);
  const disp = buscarOpcion(disparadoresPersuasion, selection.disparador);
  const gen = buscarOpcion(codigosGeneracionales, selection.generacion);
  const avz = selection.tecAvanzada && selection.tecAvanzada !== "none" ? buscarOpcion(psicologiaAvanzada, selection.tecAvanzada) : null;

  const prompt = construirPrompt(
    service,
    arq?.label || selection.arquetipo,
    marca?.label || selection.vozMarca,
    disp?.label || selection.disparador,
    gen?.label || selection.generacion,
    avz?.label,
    selection.customNotes || undefined,
    (selection as any).canalPNL || undefined
  );

  const handleCopiar = () => {
    navigator.clipboard.writeText(prompt);
    setCopiado(true);
    toast({ title: "Prompt copiado al portapapeles" });
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleGuardar = async () => {
    await guardarEstrategia.mutateAsync({
      service_id: service.id,
      name: nombreEstrategia,
      archetype: selection.arquetipo,
      brand_voice: selection.vozMarca,
      persuasion_trigger: selection.disparador,
      generation: selection.generacion,
      advanced_tech: selection.tecAvanzada !== "none" ? selection.tecAvanzada : undefined,
      generated_prompt: prompt,
    });
  };

  const elementos = [
    { etiqueta: "Arquetipo Objetivo", valor: arq },
    { etiqueta: "Voz de Marca", valor: marca },
    { etiqueta: "Disparador de Persuasión", valor: disp },
    { etiqueta: "Generación", valor: gen },
    ...(avz ? [{ etiqueta: "Técnica Avanzada", valor: avz }] : []),
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al Mixer
      </Button>

      <Card className="border-primary/30 shadow-elevated overflow-hidden">
        <div className="h-1.5 gradient-primary" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Perfil de Estrategia</CardTitle>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {elementos.map(({ etiqueta, valor }) => (
              <div key={etiqueta} className="rounded-lg border border-border/50 p-3 bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{etiqueta}</p>
                <p className="font-medium text-foreground text-sm">{valor?.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{valor?.description}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt Generado</p>
            <div className="rounded-lg bg-muted/50 border border-border/50 p-4 text-sm text-foreground leading-relaxed font-mono">
              {prompt}
            </div>
          </div>

          <Button onClick={handleCopiar} variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5">
            {copiado ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copiado ? "¡Copiado!" : "Copiar Prompt para IA"}
          </Button>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardar en "Mis Estrategias"</Label>
            <div className="flex gap-2">
              <Input value={nombreEstrategia} onChange={(e) => setNombreEstrategia(e.target.value)} placeholder="Nombre de la estrategia" className="flex-1" />
              <Button onClick={handleGuardar} disabled={guardarEstrategia.isPending} className="gradient-primary text-primary-foreground gap-2">
                <Save className="w-4 h-4" />
                {guardarEstrategia.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyCard;
