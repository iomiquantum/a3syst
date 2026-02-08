import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceConfigurator from "@/components/psycho-matrix/ServiceConfigurator";
import MatrixMixer from "@/components/psycho-matrix/MatrixMixer";
import StrategyCard from "@/components/psycho-matrix/StrategyCard";
import SavedStrategiesList from "@/components/psycho-matrix/SavedStrategiesList";
import type { PsychoService } from "@/hooks/usePsychoMatrix";
import { Brain, Beaker, Sparkles, BookOpen } from "lucide-react";

type Step = "service" | "mixer" | "card";

interface Selection {
  archetype: string;
  brandVoice: string;
  trigger: string;
  generation: string;
  advancedTech: string;
}

const PsychoMatrixPage = () => {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<PsychoService | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const handleSelectService = (svc: PsychoService) => {
    setSelectedService(svc);
    setStep("mixer");
  };

  const handleGenerate = (sel: Selection) => {
    setSelection(sel);
    setStep("card");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">PSYCHO-MATRIX AI</h1>
            <p className="text-sm text-muted-foreground">Marketing Strategy Profiles powered by psychological frameworks</p>
          </div>
        </div>

        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList>
            <TabsTrigger value="builder" className="gap-2"><Sparkles className="w-4 h-4" /> Strategy Builder</TabsTrigger>
            <TabsTrigger value="saved" className="gap-2"><BookOpen className="w-4 h-4" /> My Strategies</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-0">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { key: "service", label: "Service", icon: Beaker },
                { key: "mixer", label: "Mixer", icon: Brain },
                { key: "card", label: "Strategy", icon: Sparkles },
              ].map(({ key, label, icon: Icon }, i) => (
                <div key={key} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-px ${step === key || (step === "card" && key === "mixer") || (step === "card" && key === "service") || (step === "mixer" && key === "service") ? "bg-primary" : "bg-border"}`} />}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${step === key ? "gradient-primary text-primary-foreground" : step === "card" && (key === "service" || key === "mixer") ? "bg-primary/10 text-primary" : step === "mixer" && key === "service" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {step === "service" && <ServiceConfigurator onSelectService={handleSelectService} />}
            {step === "mixer" && selectedService && (
              <MatrixMixer service={selectedService} onGenerate={handleGenerate} onBack={() => setStep("service")} />
            )}
            {step === "card" && selectedService && selection && (
              <StrategyCard service={selectedService} selection={selection} onBack={() => setStep("mixer")} />
            )}
          </TabsContent>

          <TabsContent value="saved">
            <SavedStrategiesList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PsychoMatrixPage;
