import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  digitalArchetypes, brandArchetypes, persuasionTriggers,
  generationalCodes, advancedPsychology, buildPrompt,
} from "@/lib/psychoMatrixData";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { useSaveStrategy } from "@/hooks/usePsychoMatrix";
import { Copy, Save, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Selection {
  archetype: string;
  brandVoice: string;
  trigger: string;
  generation: string;
  advancedTech: string;
}

interface Props {
  service: PsychoService;
  selection: Selection;
  onBack: () => void;
}

function findLabel(list: { id: string; label: string; description: string }[], id: string) {
  return list.find((i) => i.id === id);
}

const StrategyCard = ({ service, selection, onBack }: Props) => {
  const { toast } = useToast();
  const saveStrategy = useSaveStrategy();
  const [strategyName, setStrategyName] = useState(`${service.name} Strategy`);
  const [copied, setCopied] = useState(false);

  const arch = findLabel(digitalArchetypes, selection.archetype);
  const brand = findLabel(brandArchetypes, selection.brandVoice);
  const trigger = findLabel(persuasionTriggers, selection.trigger);
  const gen = findLabel(generationalCodes, selection.generation);
  const adv = selection.advancedTech && selection.advancedTech !== "none" ? findLabel(advancedPsychology, selection.advancedTech) : null;

  const prompt = buildPrompt(
    service,
    arch?.label || selection.archetype,
    brand?.label || selection.brandVoice,
    trigger?.label || selection.trigger,
    gen?.label || selection.generation,
    adv?.label
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast({ title: "Prompt copiado al portapapeles" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await saveStrategy.mutateAsync({
      service_id: service.id,
      name: strategyName,
      archetype: selection.archetype,
      brand_voice: selection.brandVoice,
      persuasion_trigger: selection.trigger,
      generation: selection.generation,
      advanced_tech: selection.advancedTech !== "none" ? selection.advancedTech : undefined,
      generated_prompt: prompt,
    });
  };

  const items = [
    { label: "Target Archetype", value: arch },
    { label: "Brand Voice", value: brand },
    { label: "Persuasion Trigger", value: trigger },
    { label: "Generation", value: gen },
    ...(adv ? [{ label: "Advanced Tech", value: adv }] : []),
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al Mixer
      </Button>

      {/* Strategy card */}
      <Card className="border-primary/30 shadow-elevated overflow-hidden">
        <div className="h-1.5 gradient-primary" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Strategy Profile</CardTitle>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border/50 p-3 bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="font-medium text-foreground text-sm">{value?.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{value?.description}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Generated prompt */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Prompt</p>
            <div className="rounded-lg bg-muted/50 border border-border/50 p-4 text-sm text-foreground leading-relaxed font-mono">
              {prompt}
            </div>
          </div>

          <Button onClick={handleCopy} variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5">
            {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? "¡Copiado!" : "Copy Prompt for AI"}
          </Button>

          <Separator />

          {/* Save strategy */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardar en "My Strategies"</Label>
            <div className="flex gap-2">
              <Input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} placeholder="Nombre de la estrategia" className="flex-1" />
              <Button onClick={handleSave} disabled={saveStrategy.isPending} className="gradient-primary text-primary-foreground gap-2">
                <Save className="w-4 h-4" />
                {saveStrategy.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyCard;
