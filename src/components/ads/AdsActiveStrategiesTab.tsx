import { useState } from "react";
import { Rocket, Search, DollarSign, Users, TrendingUp, Plus, Eye, BarChart3, Pause, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { useAds } from "@/hooks/useAds";

interface Props { ads: ReturnType<typeof useAds>; }

const statusColors: Record<string, string> = {
  active: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  draft: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary border-primary/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  active: "Activa", paused: "Pausada", draft: "Borrador", completed: "Finalizada", error: "Error",
};

const AdsActiveStrategiesTab = ({ ads }: Props) => {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? ads.campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : ads.campaigns;

  const m = ads.totalMetrics;
  const roi = m.spend > 0 ? (m.revenue / m.spend).toFixed(1) : "0";

  const togglePause = async (campaign: typeof ads.campaigns[0]) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await ads.updateCampaign(campaign.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Rocket className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Estrategias Activas</h2>
          <p className="text-sm text-muted-foreground">Gestiona y monitorea todas tus estrategias publicitarias en un solo lugar.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Por cada $1 invertido:", value: `$${roi}`, sub: "en Ventas", gradient: "from-green-500/10 to-green-500/5" },
          { icon: DollarSign, label: "Importe invertido", value: `$${m.spend.toFixed(0)}`, sub: "Dinero invertido en campañas", gradient: "from-blue-500/10 to-blue-500/5" },
          { icon: TrendingUp, label: "Conversiones", value: `${m.conversions}`, sub: "Conversiones generadas", gradient: "from-purple-500/10 to-purple-500/5" },
          { icon: Users, label: "Cuentas alcanzadas", value: `${m.reach.toLocaleString()}`, sub: "Alcance de tus campañas", gradient: "from-orange-500/10 to-orange-500/5" },
        ].map((kpi, i) => (
          <Card key={i} className={cn("shadow-card bg-gradient-to-br border-border/50", kpi.gradient)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <kpi.icon className="w-4 h-4" /> {kpi.label}
              </div>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overlay when no metrics */}
      {ads.campaigns.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground text-lg mb-1">Tus métricas están en camino</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Las métricas pueden tomar un tiempo en reflejarse una vez que tus estrategias empiecen a correr. ¡Relax, es completamente normal!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Rocket className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="font-bold text-foreground">Estrategias lanzadas</p>
                <p className="text-sm text-muted-foreground">Arrastra, elige o genera con IA las imágenes restantes.</p>
              </div>
            </div>
            <Button className="gradient-primary text-primary-foreground shadow-md" size="lg">
              <Plus className="w-4 h-4 mr-2" /> Nueva estrategia
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estrategias..." className="pl-10 h-11" />
          </div>

          <div className="space-y-3">
            {filtered.map((c) => (
              <Card key={c.id} className="shadow-sm hover:shadow-md transition-all duration-200 border-border/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Rocket className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={cn("text-xs", statusColors[c.status])}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{c.platform === "meta" ? "Meta" : c.platform}</Badge>
                    </div>
                    <div className="flex items-center gap-5 mt-2.5 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">Presupuesto Diario</span>
                        <span className="font-bold text-foreground text-sm">${Number(c.daily_budget).toFixed(2)} {c.currency}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">Creativos</span>
                        <span className="font-bold text-foreground text-sm">{c.creatives_count}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">Creada</span>
                        <span className="font-bold text-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(c.status === "active" || c.status === "paused") && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => togglePause(c)} title={c.status === "active" ? "Pausar" : "Reanudar"}>
                        {c.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="shadow-sm">
                      <Eye className="w-4 h-4 mr-1.5" /> Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Rocket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {search ? "No se encontraron estrategias." : "Aún no tienes estrategias lanzadas. ¡Crea tu primera!"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdsActiveStrategiesTab;
