import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePsychoStrategies, type PsychoStrategy } from "@/hooks/usePsychoMatrix";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada,
} from "@/lib/psychoMatrixData";
import { Copy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const buscar = (lista: { id: string; label: string }[], id: string) => lista.find((i) => i.id === id)?.label || id;

const SavedStrategiesList = () => {
  const { data: estrategias = [], isLoading } = usePsychoStrategies();
  const { toast } = useToast();

  const copiarPrompt = (prompt: string | null) => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    toast({ title: "Prompt copiado" });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-8">Cargando estrategias...</p>;
  if (estrategias.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No hay estrategias guardadas aún.</p>;

  return (
    <div className="grid gap-3">
      {estrategias.map((s) => (
        <Card key={s.id} className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="font-medium text-foreground truncate">{s.name}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposDigitales, s.archetype)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposMarca, s.brand_voice)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{buscar(disparadoresPersuasion, s.persuasion_trigger)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{buscar(codigosGeneracionales, s.generation)}</Badge>
                  {s.advanced_tech && <Badge variant="outline" className="text-[10px]">{buscar(psicologiaAvanzada, s.advanced_tech)}</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copiarPrompt(s.generated_prompt)} className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SavedStrategiesList;
