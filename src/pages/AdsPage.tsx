import { useState } from "react";
import { Zap, Settings2, Dna, FileText, Rocket, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdsConfigTab from "@/components/ads/AdsConfigTab";
import AdsADNTab from "@/components/ads/AdsADNTab";
import AdsStrategiesTab from "@/components/ads/AdsStrategiesTab";
import AdsActiveStrategiesTab from "@/components/ads/AdsActiveStrategiesTab";
import { cn } from "@/lib/utils";
import { useAds } from "@/hooks/useAds";

type AdsSection = "config" | "adn" | "estrategias" | "lanzadas";

const sideNav = [
  { key: "config" as AdsSection, icon: Settings2, label: "Configuración", group: "Centro de Marca" },
  { key: "adn" as AdsSection, icon: Dna, label: "ADN", group: "Centro de Marca" },
  { key: "estrategias" as AdsSection, icon: FileText, label: "Estrategias de Pauta", group: "Centro de Estrategias" },
  { key: "lanzadas" as AdsSection, icon: Rocket, label: "Estrategias Lanzadas", group: "Centro de Estrategias" },
];

const AdsPage = () => {
  const [section, setSection] = useState<AdsSection>("config");
  const ads = useAds();
  const groups = ["Centro de Marca", "Centro de Estrategias"];

  if (ads.loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-0 h-[calc(100vh-8rem)]">
        {/* Internal sidebar */}
        <div className="w-56 shrink-0 border-r border-border pr-4 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">ADS</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Gestión publicitaria</p>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{group}</p>
              {sideNav.filter(n => n.group === group).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-all duration-200",
                    section === key
                      ? "gradient-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Connected accounts summary */}
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Cuentas</p>
            <div className="space-y-1.5 px-2">
              {["meta", "google", "tiktok"].map(p => {
                const acc = ads.accounts.find(a => a.platform === p);
                const label = p === "meta" ? "Meta Ads" : p === "google" ? "Google Ads" : "TikTok Ads";
                return (
                  <div key={p} className="flex items-center gap-2 text-xs">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      acc?.status === "connected" ? "bg-[hsl(var(--success))]" : "bg-muted-foreground/30"
                    )} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto pl-6">
          {section === "config" && <AdsConfigTab ads={ads} />}
          {section === "adn" && <AdsADNTab ads={ads} />}
          {section === "estrategias" && <AdsStrategiesTab ads={ads} />}
          {section === "lanzadas" && <AdsActiveStrategiesTab ads={ads} />}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdsPage;
