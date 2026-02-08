import { useState } from "react";
import { Zap, Image, Video, Info, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { useAds } from "@/hooks/useAds";

interface Props { ads: ReturnType<typeof useAds>; }

const channelFilters = ["Todos", "Instagram", "WhatsApp", "Web"];

const AdsStrategiesTab = ({ ads }: Props) => {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("Todos");

  const filtered = ads.templates.filter(s => {
    const matchesSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = channelFilter === "Todos" || s.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const handleUseStrategy = (template: typeof ads.templates[0]) => {
    ads.createCampaign({
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      template_id: template.id,
      platform: "meta",
      daily_budget: template.min_budget,
      currency: template.currency,
      creatives_count: template.media_count,
      status: "draft",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Estrategias de Pauta</h2>
          <p className="text-sm text-muted-foreground">Explora y utiliza estrategias de copywriting probadas para tus estrategias publicitarias.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estrategias..." className="pl-10 h-10" />
        </div>
        <div className="flex gap-1.5">
          {channelFilters.map(f => (
            <button
              key={f}
              onClick={() => setChannelFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                channelFilter === f
                  ? "gradient-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto text-muted-foreground">
          {filtered.length} estrategia{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Card key={s.id} className="shadow-card hover:shadow-lg transition-all duration-300 border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent group">
            <CardContent className="p-5 flex flex-col h-full">
              <h3 className="font-bold text-foreground text-sm leading-snug min-h-[44px]">{s.name}</h3>
              <Badge variant="secondary" className="w-fit mt-2 text-xs font-semibold">{s.objective}</Badge>

              <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1">Presupuesto mínimo: <Info className="w-3 h-3" /></p>
                <p className="text-lg font-bold text-foreground">${s.min_budget}/{s.currency}</p>
              </div>

              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                {s.media_type === "images"
                  ? <Image className="w-4 h-4 text-primary" />
                  : <Video className="w-4 h-4 text-primary" />}
                <span className="font-medium">{s.media_count} {s.media_type === "images" ? "imágenes" : "videos"}</span>
                <Info className="w-3 h-3" />
              </div>

              <Button
                className="mt-4 w-full gradient-primary text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow"
                onClick={() => handleUseStrategy(s)}
              >
                Usar esta estrategia
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Filter className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No se encontraron estrategias con los filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default AdsStrategiesTab;
