import { useState } from "react";
import { Zap, Settings2, Dna, FileText, Rocket } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdsConfigTab from "@/components/ads/AdsConfigTab";
import AdsADNTab from "@/components/ads/AdsADNTab";
import AdsStrategiesTab from "@/components/ads/AdsStrategiesTab";
import AdsActiveStrategiesTab from "@/components/ads/AdsActiveStrategiesTab";
import { cn } from "@/lib/utils";

type AdsSection = "config" | "adn" | "estrategias" | "lanzadas";

const sideNav = [
  { key: "config" as AdsSection, icon: Settings2, label: "Configuración", group: "Centro de Marca" },
  { key: "adn" as AdsSection, icon: Dna, label: "ADN", group: "Centro de Marca" },
  { key: "estrategias" as AdsSection, icon: FileText, label: "Estrategias de Pauta", group: "Centro de Estrategias" },
  { key: "lanzadas" as AdsSection, icon: Rocket, label: "Estrategias Lanzadas", group: "Centro de Estrategias" },
];

const AdsPage = () => {
  const [section, setSection] = useState<AdsSection>("config");

  const groups = ["Centro de Marca", "Centro de Estrategias"];

  return (
    <AppLayout>
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Internal sidebar */}
        <div className="w-56 shrink-0 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">ADS</h1>
              <p className="text-[10px] text-muted-foreground">Gestión publicitaria</p>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group} className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>
              {sideNav.filter(n => n.group === group).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-all",
                    section === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {section === "config" && <AdsConfigTab />}
          {section === "adn" && <AdsADNTab />}
          {section === "estrategias" && <AdsStrategiesTab />}
          {section === "lanzadas" && <AdsActiveStrategiesTab />}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdsPage;
