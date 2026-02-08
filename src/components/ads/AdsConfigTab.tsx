import { useState } from "react";
import { Link2, CheckCircle2, Clock, Settings2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdsMetaConfig from "./AdsMetaConfig";

interface AdPlatform {
  key: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  connected: boolean;
}

const platforms: AdPlatform[] = [
  { key: "meta", name: "Meta Ads", icon: "📘", description: "Conecta tu cuenta de Meta para lanzar estrategias en Facebook e Instagram.", available: true, connected: false },
  { key: "google", name: "Google Ads", icon: "🔍", description: "Vincula tu cuenta de Google Ads para lanzar estrategias en los canales de Google.", available: false, connected: false },
  { key: "tiktok", name: "TikTok Ads", icon: "🎵", description: "Conecta tu cuenta de TikTok Ads para lanzar estrategias en TikTok.", available: false, connected: false },
];

const AdsConfigTab = () => {
  const [configuring, setConfiguring] = useState<string | null>(null);

  if (configuring === "meta") {
    return (
      <div className="space-y-6">
        <button onClick={() => setConfiguring(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Configuración
        </button>
        <AdsMetaConfig />
      </div>
    );
  }

  const connectedCount = platforms.filter(p => p.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Conectar Cuentas Publicitarias</h2>
          <p className="text-sm text-muted-foreground">Conecta tus cuentas publicitarias para lanzar estrategias más inteligentes y rápidas.</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{connectedCount}</span> de {platforms.length} plataforma{platforms.length !== 1 ? "s" : ""} conectada{connectedCount !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3">
        {platforms.map((p) => (
          <Card key={p.key} className="shadow-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.description}</p>
                {p.connected && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <p>Has conectado tu cuenta de Meta, pero necesitas completar la configuración para poder crear estrategias.</p>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> Business Manager</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> Cuenta Publicitaria</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> Página de Facebook</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {!p.available ? (
                  <Badge variant="outline" className="text-muted-foreground">Próximamente</Badge>
                ) : p.connected ? (
                  <Button onClick={() => setConfiguring(p.key)} className="gradient-primary text-primary-foreground">
                    <Settings2 className="w-4 h-4 mr-1.5" /> Completar Configuración
                  </Button>
                ) : (
                  <Button onClick={() => setConfiguring(p.key)} variant="outline">
                    <Settings2 className="w-4 h-4 mr-1.5" /> Configurar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdsConfigTab;
