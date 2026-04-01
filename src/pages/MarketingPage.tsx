import { useState } from "react";
import {
  BarChart3, Users, MessageSquare, Target, Megaphone,
  Sparkles, Bot, ArrowUpDown, Tag, Cog, Link2,
  FileText, Zap, Key,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MarketingKPIs from "@/components/marketing/MarketingKPIs";
import DifusionesTab from "@/components/marketing/DifusionesTab";
import AudienciasTab from "@/components/marketing/AudienciasTab";
import MarketingContactsTab from "@/components/marketing/MarketingContactsTab";
import TokenAPIsTab from "@/components/marketing/TokenAPIsTab";
import TagsTab from "@/components/marketing/TagsTab";
import FragmentosTab from "@/components/marketing/FragmentosTab";
import EmbudoTab from "@/components/marketing/EmbudoTab";
import AutomatizacionesTab from "@/components/marketing/AutomatizacionesTab";
import PlantillasTab from "@/components/marketing/PlantillasTab";

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { key: "indices", label: "Índices", icon: BarChart3 },
  { key: "contactos", label: "Contactos", icon: Users },
  { key: "difusiones", label: "Difusiones", icon: MessageSquare },
  { key: "audiencias", label: "Audiencias", icon: Target },
  { key: "campanas", label: "Campañas", icon: Megaphone, badge: "Próximamente", badgeColor: "bg-primary/10 text-primary" },
  { key: "formulario", label: "Formulario Mágico", icon: Sparkles },
  { key: "agente_ia", label: "Agente IA", icon: Bot },
];

const CONFIG_ITEMS: NavItem[] = [
  { key: "embudo", label: "Embudo", icon: ArrowUpDown },
  { key: "tags", label: "Tags", icon: Tag },
  { key: "automatizaciones", label: "Automatizaciones", icon: Cog },
  { key: "integraciones", label: "Integraciones", icon: Link2 },
  { key: "plantillas", label: "Plantillas", icon: FileText },
  { key: "fragmentos", label: "Fragmentos", icon: Zap },
  { key: "tokens", label: "Token APIs", icon: Key },
];

const MarketingPage = () => {
  const [activeSection, setActiveSection] = useState("contactos");

  const renderContent = () => {
    switch (activeSection) {
      case "indices":
        return <MarketingKPIs />;
      case "contactos":
        return <MarketingContactsTab />;
      case "difusiones":
        return <DifusionesTab />;
      case "audiencias":
        return <AudienciasTab />;
      case "tokens":
        return <TokenAPIsTab />;
      case "tags":
        return <TagsTab />;
      case "fragmentos":
        return <FragmentosTab />;
      case "embudo":
        return <EmbudoTab />;
      case "automatizaciones":
        return <AutomatizacionesTab />;
      case "formulario":
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Formulario Mágico</p>
            <p className="text-sm mt-1">Captura leads automáticamente desde tu sitio web. Próximamente.</p>
          </div>
        );
      case "plantillas":
        return <PlantillasTab />;
      case "campanas":
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Campañas</p>
            <p className="text-sm mt-1">Gestión avanzada de campañas. Próximamente.</p>
          </div>
        );
      case "integraciones":
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Integraciones</p>
            <p className="text-sm mt-1">Configura tus integraciones desde la sección de canales</p>
          </div>
        );
      case "agente_ia":
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Agente IA</p>
            <p className="text-sm mt-1">Configura tu agente IA desde Configuración → Configuración IA</p>
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{MAIN_ITEMS.find(i => i.key === activeSection)?.label || CONFIG_ITEMS.find(i => i.key === activeSection)?.label || "Sección"}</p>
            <p className="text-sm mt-1">Próximamente</p>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex border border-border rounded-lg overflow-hidden bg-card">
        {/* Sidebar */}
        <div className="w-[220px] border-r border-border shrink-0 hidden md:block">
          <ScrollArea className="h-full">
            <div className="p-3">
              <h2 className="text-base font-bold text-foreground px-2 py-3">Marketing</h2>

              {/* Main items */}
              <div className="space-y-0.5">
                {MAIN_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => !item.disabled && setActiveSection(item.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      activeSection === item.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted",
                      item.disabled && "opacity-40 cursor-default"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {activeSection === item.key && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    {item.badge && (
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0", item.badgeColor)}>
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-border relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card px-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Configuración
                </span>
              </div>

              {/* Config items */}
              <div className="space-y-0.5">
                {CONFIG_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      activeSection === item.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-auto p-4">
          {renderContent()}
        </div>
      </div>
    </AppLayout>
  );
};

export default MarketingPage;
