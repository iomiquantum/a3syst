import { useState } from "react";
import { Settings2, Power, PowerOff, Trash2, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHANNELS, useChannelCredentials, type ChannelKey } from "@/hooks/useChannelCredentials";
import ChannelSetupWizard from "./ChannelSetupWizard";

const statusConfig = {
  activo: { icon: CheckCircle2, label: "Conectado", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  inactivo: { icon: PowerOff, label: "Desactivado", color: "bg-muted text-muted-foreground" },
  pendiente: { icon: Clock, label: "Pendiente", color: "bg-warning/10 text-warning" },
  no_configurado: { icon: AlertCircle, label: "No configurado", color: "bg-muted text-muted-foreground" },
};

const TokenAPIsTab = () => {
  const { credentials, loading, saveCredentials, toggleActive, deleteCredential, getChannelStatus } = useChannelCredentials();
  const [wizardChannel, setWizardChannel] = useState<ChannelKey | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conecta los canales de comunicación de tu negocio. Te guiaremos paso a paso en cada integración.
      </p>

      <div className="grid gap-3">
        {CHANNELS.map(channel => {
          const status = getChannelStatus(channel.key);
          const st = statusConfig[status as keyof typeof statusConfig];
          const StatusIcon = st.icon;
          const cred = credentials.find(c => c.channel === channel.key);

          return (
            <Card key={channel.key} className="shadow-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${channel.color}`}>
                  {channel.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{channel.label}</p>
                  <p className="text-xs text-muted-foreground">{channel.provider}</p>
                </div>
                <Badge variant="outline" className={`gap-1 ${st.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {st.label}
                </Badge>
                <div className="flex items-center gap-1">
                  {cred && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={cred.is_active ? "Desactivar" : "Activar"}
                        onClick={() => toggleActive(cred.id, !cred.is_active)}
                      >
                        {cred.is_active ? <Power className="w-4 h-4 text-[hsl(var(--success))]" /> : <PowerOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteCredential(cred.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWizardChannel(channel.key as ChannelKey)}
                  >
                    <Settings2 className="w-4 h-4 mr-1" />
                    {cred ? "Editar" : "Configurar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {wizardChannel && (
        <ChannelSetupWizard
          channelKey={wizardChannel}
          open={!!wizardChannel}
          onOpenChange={(open) => { if (!open) setWizardChannel(null); }}
          existingCredentials={
            credentials.find(c => c.channel === wizardChannel)?.credentials
          }
          onSave={saveCredentials}
        />
      )}
    </div>
  );
};

export default TokenAPIsTab;
