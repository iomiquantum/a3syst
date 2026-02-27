import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ServiceConfigurator from "@/components/psycho-matrix/ServiceConfigurator";
import MatrixMixer, { type Seleccion } from "@/components/psycho-matrix/MatrixMixer";
import StrategyCard from "@/components/psycho-matrix/StrategyCard";
import SavedStrategiesList from "@/components/psycho-matrix/SavedStrategiesList";
import { usePsychoServices, usePsychoStrategies, type PsychoService } from "@/hooks/usePsychoMatrix";
import { Brain, Beaker, Sparkles, BookOpen, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales,
} from "@/lib/psychoMatrixData";

type Paso = "servicio" | "mixer" | "tarjeta";

const archetypeColors: Record<string, { border: string; bg: string; text: string; emoji: string }> = {
  aspiracional: { border: "border-blue-500/40", bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-400", emoji: "🧭" },
  esceptico: { border: "border-amber-500/40", bg: "from-amber-500/10 to-amber-600/5", text: "text-amber-400", emoji: "🏛️" },
  buscador_atajos: { border: "border-emerald-500/40", bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-400", emoji: "💚" },
  polemico: { border: "border-red-500/40", bg: "from-red-500/10 to-red-600/5", text: "text-red-400", emoji: "⚔️" },
  intelectual: { border: "border-violet-500/40", bg: "from-violet-500/10 to-violet-600/5", text: "text-violet-400", emoji: "📚" },
  empatico: { border: "border-pink-500/40", bg: "from-pink-500/10 to-pink-600/5", text: "text-pink-400", emoji: "💗" },
};
const defaultArchColor = { border: "border-primary/40", bg: "from-primary/10 to-primary/5", text: "text-primary", emoji: "🧠" };

const buscar = (lista: { id: string; label: string }[], id: string) => lista.find(i => i.id === id)?.label || id;

const PsychoMatrixPage = () => {
  const navigate = useNavigate();
  const { data: services = [], isLoading: loadingServices } = usePsychoServices();
  const { data: strategies = [], isLoading: loadingStrategies } = usePsychoStrategies();
  const [paso, setPaso] = useState<Paso>("servicio");
  const [servicioSeleccionado, setServicioSeleccionado] = useState<PsychoService | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  const hasContent = services.length > 0 || strategies.length > 0;
  const isLoading = loadingServices || loadingStrategies;

  // Group strategies by service
  const strategiesByService = useMemo(() => {
    const map: Record<string, typeof strategies> = {};
    strategies.forEach(s => {
      if (!map[s.service_id]) map[s.service_id] = [];
      map[s.service_id].push(s);
    });
    return map;
  }, [strategies]);

  const handleSeleccionarServicio = (svc: PsychoService) => {
    setServicioSeleccionado(svc);
    setPaso("mixer");
  };

  const handleGenerar = (sel: Seleccion) => {
    setSeleccion(sel);
    setPaso("tarjeta");
  };

  // Welcome screen when no content
  if (!isLoading && !hasContent) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 animate-pulse">
            <Brain className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            Psycho-Matrix AI
          </h1>
          <p className="text-lg text-foreground/80 mb-2">El Cerebro Estratégico de tu Negocio</p>
          <p className="text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed">
            La IA analiza cada servicio de tu negocio y genera estrategias de marketing basadas en
            psicología de persuasión y arquetipos de cliente. No existe en ningún otro software.
          </p>
          <Button
            size="lg"
            className="gradient-primary text-primary-foreground gap-2 text-base h-12 px-8"
            onClick={() => setPaso("servicio")}
          >
            <Brain className="w-5 h-5" /> 🧠 Analizar mis servicios
          </Button>
          {/* Only show welcome; clicking will force hasContent check to pass via tabs below */}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">PSYCHO-MATRIX AI</h1>
              <p className="text-sm text-muted-foreground">Estrategias de marketing con frameworks psicológicos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{services.length} servicios</Badge>
            <Badge variant="secondary">{strategies.length} estrategias</Badge>
          </div>
        </div>

        <Tabs defaultValue="estrategias" className="space-y-4">
          <TabsList>
            <TabsTrigger value="estrategias" className="gap-2"><Sparkles className="w-4 h-4" /> Estrategias</TabsTrigger>
            <TabsTrigger value="constructor" className="gap-2"><Beaker className="w-4 h-4" /> Constructor</TabsTrigger>
            <TabsTrigger value="guardadas" className="gap-2"><BookOpen className="w-4 h-4" /> Mis Estrategias</TabsTrigger>
          </TabsList>

          {/* ═══ STRATEGIES OVERVIEW ═══ */}
          <TabsContent value="estrategias" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : services.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-primary opacity-40 animate-pulse" />
                  <p className="text-foreground font-medium">No tienes servicios analizados aún</p>
                  <p className="text-sm text-muted-foreground mt-1">Crea tu primer servicio en el Constructor para generar estrategias</p>
                </CardContent>
              </Card>
            ) : (
              services.map(svc => {
                const svcStrategies = strategiesByService[svc.id] || [];
                const isAnalyzed = svcStrategies.length > 0;
                return (
                  <div key={svc.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Beaker className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.core_benefit}</p>
                        </div>
                        {svc.price > 0 && <Badge variant="secondary" className="text-[10px]">${svc.price}</Badge>}
                        {isAnalyzed ? (
                          <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-[10px]">🧠 Analizado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">⚪ Sin analizar</Badge>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleSeleccionarServicio(svc)} className="gap-1.5 text-xs">
                        {isAnalyzed ? "Ver estrategias" : "Generar análisis"}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>

                    {svcStrategies.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-11">
                        {svcStrategies.map(strat => {
                          const archColor = archetypeColors[strat.archetype] || defaultArchColor;
                          return (
                            <Card key={strat.id}
                              className={cn(
                                "relative overflow-hidden border-2 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5",
                                archColor.border,
                              )}
                            >
                              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", archColor.bg)} />
                              <CardContent className="relative p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{archColor.emoji}</span>
                                    <div>
                                      <p className={cn("font-semibold text-sm", archColor.text)}>
                                        {buscar(arquetiposDigitales, strat.archetype)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">{strat.name}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[9px]">
                                    🎯 {buscar(disparadoresPersuasion, strat.persuasion_trigger)}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px]">
                                    👥 {buscar(codigosGeneracionales, strat.generation)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Voz: {buscar(arquetiposMarca, strat.brand_voice)}
                                </p>
                                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5"
                                  onClick={() => navigate("/contenido")}
                                >
                                  📱 Crear contenido con esta estrategia
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ═══ CONSTRUCTOR ═══ */}
          <TabsContent value="constructor" className="space-y-0">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { key: "servicio", label: "Servicio", icon: Beaker },
                { key: "mixer", label: "Mixer", icon: Brain },
                { key: "tarjeta", label: "Estrategia", icon: Sparkles },
              ].map(({ key, label, icon: Icon }, i) => {
                const pasoActivo = paso === key;
                const pasoCompletado =
                  (paso === "mixer" && key === "servicio") ||
                  (paso === "tarjeta" && (key === "servicio" || key === "mixer"));
                return (
                  <div key={key} className="flex items-center gap-2">
                    {i > 0 && <div className={`w-8 h-px ${pasoActivo || pasoCompletado ? "bg-primary" : "bg-border"}`} />}
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      pasoActivo ? "gradient-primary text-primary-foreground" :
                      pasoCompletado ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>

            {paso === "servicio" && <ServiceConfigurator onSelectService={handleSeleccionarServicio} />}
            {paso === "mixer" && servicioSeleccionado && (
              <MatrixMixer service={servicioSeleccionado} onGenerate={handleGenerar} onBack={() => setPaso("servicio")} />
            )}
            {paso === "tarjeta" && servicioSeleccionado && seleccion && (
              <StrategyCard service={servicioSeleccionado} selection={seleccion} onBack={() => setPaso("mixer")} />
            )}
          </TabsContent>

          {/* ═══ SAVED STRATEGIES ═══ */}
          <TabsContent value="guardadas">
            <SavedStrategiesList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PsychoMatrixPage;
