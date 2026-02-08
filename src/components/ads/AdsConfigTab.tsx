import { useState } from "react";
import { Link2, CheckCircle2, Clock, Settings2, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdsMetaConfig from "./AdsMetaConfig";
import type { useAds } from "@/hooks/useAds";

interface Props { ads: ReturnType<typeof useAds>; }

const platforms = [
  { key: "meta", name: "Meta Ads", icon: "📘", description: "Conecta tu cuenta de Meta para lanzar campañas en Facebook e Instagram.", available: true, requirements: ["Business Manager", "Cuenta Publicitaria", "Página de Facebook"] },
  { key: "google", name: "Google Ads", icon: "🔍", description: "Vincula tu cuenta de Google Ads para lanzar estrategias en los canales de Google.", available: false, requirements: [] },
  { key: "tiktok", name: "TikTok Ads", icon: "🎵", description: "Conecta tu cuenta de TikTok Ads para lanzar estrategias en TikTok.", available: false, requirements: [] },
];

const AdsConfigTab = ({ ads }: Props) => {
  const [configuring, setConfiguring] = useState<string | null>(null);

  if (configuring === "meta") {
    return (
      <div className="space-y-6">
        <button onClick={() => setConfiguring(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Volver a Configuración
        </button>
        <AdsMetaConfig ads={ads} />
      </div>
    );
  }

  const connectedCount = ads.accounts.filter(a => a.status === "connected").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Link2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Conectar Cuentas Publicitarias</h2>
          <p className="text-sm text-muted-foreground">Conecta tus cuentas publicitarias para lanzar estrategias más inteligentes y rápidas.</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-bold text-foreground text-lg">{connectedCount}</span> de <span className="font-semibold">{platforms.length}</span> plataforma{platforms.length !== 1 ? "s" : ""} conectada{connectedCount !== 1 ? "s" : ""}
      </p>

      <div className="space-y-4">
        {platforms.map((p) => {
          const account = ads.accounts.find(a => a.platform === p.key);
          const isConnected = account?.status === "connected";
          const isPending = account?.status === "pending";

          return (
            <Card key={p.key} className="shadow-card hover:shadow-lg transition-all duration-300 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-3xl shrink-0">
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
                      {isConnected && (
                        <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="outline" className="text-warning border-warning/20">
                          <Clock className="w-3 h-3 mr-1" /> Pendiente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>

                    {isConnected && p.requirements.length > 0 && (
                      <div className="mt-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-sm text-muted-foreground mb-2">
                          {account?.config && Object.keys(account.config).length > 0
                            ? "Configuración completa. Puedes editar los ajustes."
                            : "Necesitas completar la configuración para crear estrategias."}
                        </p>
                        <div className="space-y-1.5">
                          {p.requirements.map(req => {
                            const configured = account?.config?.[req.toLowerCase().replace(/ /g, "_")];
                            return (
                              <div key={req} className="flex items-center gap-2 text-sm">
                                {configured
                                  ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                                  : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                <span className={configured ? "text-foreground" : "text-muted-foreground"}>{req}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 pt-1">
                    {!p.available ? (
                      <Badge variant="outline" className="text-muted-foreground px-4 py-1.5">Próximamente</Badge>
                    ) : (
                      <Button
                        onClick={() => setConfiguring(p.key)}
                        className={isConnected ? "gradient-primary text-primary-foreground shadow-md" : ""}
                        variant={isConnected ? "default" : "outline"}
                        size="lg"
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        {isConnected ? "Completar Configuración" : "Configurar"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdsConfigTab;
