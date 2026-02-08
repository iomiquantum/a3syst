import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceConfigurator from "@/components/psycho-matrix/ServiceConfigurator";
import MatrixMixer, { type Seleccion } from "@/components/psycho-matrix/MatrixMixer";
import StrategyCard from "@/components/psycho-matrix/StrategyCard";
import SavedStrategiesList from "@/components/psycho-matrix/SavedStrategiesList";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { Brain, Beaker, Sparkles, BookOpen } from "lucide-react";

type Paso = "servicio" | "mixer" | "tarjeta";

const PsychoMatrixPage = () => {
  const [paso, setPaso] = useState<Paso>("servicio");
  const [servicioSeleccionado, setServicioSeleccionado] = useState<PsychoService | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  const handleSeleccionarServicio = (svc: PsychoService) => {
    setServicioSeleccionado(svc);
    setPaso("mixer");
  };

  const handleGenerar = (sel: Seleccion) => {
    setSeleccion(sel);
    setPaso("tarjeta");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">PSYCHO-MATRIX AI</h1>
            <p className="text-sm text-muted-foreground">Perfiles de estrategia de marketing con frameworks psicológicos</p>
          </div>
        </div>

        <Tabs defaultValue="constructor" className="space-y-4">
          <TabsList>
            <TabsTrigger value="constructor" className="gap-2"><Sparkles className="w-4 h-4" /> Constructor</TabsTrigger>
            <TabsTrigger value="guardadas" className="gap-2"><BookOpen className="w-4 h-4" /> Mis Estrategias</TabsTrigger>
          </TabsList>

          <TabsContent value="constructor" className="space-y-0">
            {/* Indicadores de paso */}
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
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${pasoActivo ? "gradient-primary text-primary-foreground" : pasoCompletado ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
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

          <TabsContent value="guardadas">
            <SavedStrategiesList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PsychoMatrixPage;
