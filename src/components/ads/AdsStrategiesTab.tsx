import { Zap, Image, Video, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Strategy {
  id: string;
  name: string;
  type: "Conversiones" | "Tráfico" | "Alcance";
  minBudget: string;
  mediaType: "images" | "videos";
  mediaCount: number;
  channel: string;
}

const strategies: Strategy[] = [
  { id: "1", name: "Ventas Instagram: Estrategia Legión (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 20, channel: "Instagram" },
  { id: "2", name: "Ventas Instagram: Estrategia Versátil (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "videos", mediaCount: 10, channel: "Instagram" },
  { id: "3", name: "Ventas Instagram +Advantage 5 IMG", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 5, channel: "Instagram" },
  { id: "4", name: "Ventas Instagram: Estrategia Gladiador (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "videos", mediaCount: 20, channel: "Instagram" },
  { id: "5", name: "Ventas Instagram: Estrategia Espartana (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "videos", mediaCount: 10, channel: "Instagram" },
  { id: "6", name: "Ventas a WhatsApp: Estrategia Blindada (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 20, channel: "WhatsApp" },
  { id: "7", name: "Ventas a WhatsApp: Estrategia de Selección (Segmentación)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 10, channel: "WhatsApp" },
  { id: "8", name: "Ventas a WhatsApp: Estrategia Escudo (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 10, channel: "WhatsApp" },
  { id: "9", name: "Ventas a WhatsApp: Estrategia de Vanguardia (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "videos", mediaCount: 20, channel: "WhatsApp" },
  { id: "10", name: "Ventas en Sitio Web: Estrategia de Élite (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 20, channel: "Web" },
  { id: "11", name: "Ventas en Sitio Web: Estrategia Relámpago (Advantage)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 10, channel: "Web" },
  { id: "12", name: "Ventas en Sitio Web: Estrategia Radar (Segmentación Inteligente)", type: "Conversiones", minBudget: "$4/USD", mediaType: "images", mediaCount: 10, channel: "Web" },
];

const AdsStrategiesTab = () => {
  const handleUseStrategy = (s: Strategy) => {
    toast.success(`Estrategia "${s.name}" seleccionada`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Estrategias de Pauta</h2>
          <p className="text-sm text-muted-foreground">Explora y utiliza estrategias de copywriting probadas para tus estrategias publicitarias.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <Card key={s.id} className="shadow-card hover:shadow-lg transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5 flex flex-col h-full">
              <h3 className="font-semibold text-foreground text-sm leading-tight min-h-[40px]">{s.name}</h3>
              <Badge variant="secondary" className="w-fit mt-2 text-xs">{s.type}</Badge>

              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Presupuesto mínimo: <Info className="inline w-3 h-3" /></p>
                <p className="text-sm font-semibold text-foreground">{s.minBudget}</p>
              </div>

              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                {s.mediaType === "images" ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                <span>{s.mediaCount} {s.mediaType === "images" ? "imágenes" : "videos"}</span>
                <Info className="w-3 h-3" />
              </div>

              <Button
                className="mt-4 w-full gradient-primary text-primary-foreground"
                onClick={() => handleUseStrategy(s)}
              >
                Usar esta estrategia
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdsStrategiesTab;
