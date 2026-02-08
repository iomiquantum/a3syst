import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  digitalArchetypes, brandArchetypes, persuasionTriggers,
  generationalCodes, advancedPsychology, type MatrixOption,
} from "@/lib/psychoMatrixData";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { Beaker, Brain, Megaphone, Users, Skull, Zap, Info, ArrowLeft } from "lucide-react";

interface Selection {
  archetype: string;
  brandVoice: string;
  trigger: string;
  generation: string;
  advancedTech: string;
}

interface Props {
  service: PsychoService;
  onGenerate: (selection: Selection) => void;
  onBack: () => void;
}

const priceBadge: Record<string, string> = { low: "Low Ticket", mid: "Mid Ticket", high: "High Ticket" };

function MatrixSelect({ label, icon: Icon, options, value, onChange, optional }: {
  label: string; icon: React.ElementType; options: MatrixOption[]; value: string; onChange: (v: string) => void; optional?: boolean;
}) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {label}
          {optional && <Badge variant="outline" className="text-[10px] ml-auto">Opcional</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="none">— Ninguno —</SelectItem>}
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
        {/* Show selected description */}
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
  const [sel, setSel] = useState<Selection>({
    archetype: "", brandVoice: "", trigger: "", generation: "", advancedTech: "",
  });

  const isReady = sel.archetype && sel.brandVoice && sel.trigger && sel.generation;

  return (
    <div className="space-y-6">
      {/* Service header */}
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
          <Badge variant="secondary">{priceBadge[service.target_price] || service.target_price}</Badge>
        </CardContent>
      </Card>

      {/* 5 select cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MatrixSelect label="Target Archetype" icon={Users} options={digitalArchetypes} value={sel.archetype} onChange={(v) => setSel({ ...sel, archetype: v })} />
        <MatrixSelect label="Brand Voice" icon={Megaphone} options={brandArchetypes} value={sel.brandVoice} onChange={(v) => setSel({ ...sel, brandVoice: v })} />
        <MatrixSelect label="Persuasion Trigger" icon={Brain} options={persuasionTriggers} value={sel.trigger} onChange={(v) => setSel({ ...sel, trigger: v })} />
        <MatrixSelect label="Generation" icon={Users} options={generationalCodes} value={sel.generation} onChange={(v) => setSel({ ...sel, generation: v })} />
        <MatrixSelect label="Advanced Tech" icon={Skull} options={advancedPsychology} value={sel.advancedTech} onChange={(v) => setSel({ ...sel, advancedTech: v })} optional />
      </div>

      {/* Generate button */}
      <Button onClick={() => onGenerate(sel)} disabled={!isReady} className="w-full h-12 gradient-primary text-primary-foreground text-base font-semibold" size="lg">
        <Zap className="w-5 h-5 mr-2" />
        Generate Strategy Profile
      </Button>
    </div>
  );
};

export default MatrixMixer;
