import { useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Clock, Unplug, ShieldCheck, FlaskConical, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocialConnections, type SocialConnection } from "@/hooks/useSocialConnections";
import FacebookWizard from "./FacebookWizard";
import InstagramWizard from "./InstagramWizard";
import TestPublishModal from "./TestPublishModal";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const platforms = [
  {
    key: "facebook",
    name: "Facebook Page",
    description: "Publica contenido automáticamente en tu página de Facebook",
    color: "bg-[#1877F2]/10 text-[#1877F2]",
    borderColor: "border-[#1877F2]/20",
    available: true,
  },
  {
    key: "instagram",
    name: "Instagram Business",
    description: "Publica imágenes, videos y reels en tu cuenta de Instagram",
    color: "bg-gradient-to-br from-purple-500/10 to-orange-500/10 text-purple-500",
    borderColor: "border-purple-500/20",
    available: true,
    requiresFb: true,
  },
  {
    key: "tiktok",
    name: "TikTok Business",
    description: "Publica videos y contenido en TikTok",
    color: "bg-black/5 text-black dark:bg-white/10 dark:text-white",
    borderColor: "border-black/10 dark:border-white/10",
    available: false,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    description: "Comparte contenido profesional en LinkedIn",
    color: "bg-[#0A66C2]/10 text-[#0A66C2]",
    borderColor: "border-[#0A66C2]/20",
    available: false,
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    description: "Envía contenido por WhatsApp Business",
    color: "bg-[#25D366]/10 text-[#25D366]",
    borderColor: "border-[#25D366]/20",
    available: false,
  },
];

const SocialMediaSection = () => {
  const social = useSocialConnections();
  const [showFbWizard, setShowFbWizard] = useState(false);
  const [showIgWizard, setShowIgWizard] = useState(false);
  const [testConnection, setTestConnection] = useState<SocialConnection | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const connectedCount = social.connections.filter(c => c.token_status === "active").length;

  const handleVerify = async (connId: string) => {
    setVerifyingId(connId);
    await social.verifyToken(connId);
    setVerifyingId(null);
  };

  const maskToken = (token: string) => {
    if (!token || token.length < 6) return "••••••";
    return "••••••••••••" + token.slice(-4);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Link2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Conexiones de Redes Sociales</h2>
          <p className="text-sm text-muted-foreground">Conecta las cuentas de tu negocio para publicar contenido automáticamente desde a3syst</p>
        </div>
        <Badge variant={connectedCount > 0 ? "default" : "outline"}
          className={connectedCount > 0 ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20" : ""}>
          {connectedCount} cuenta{connectedCount !== 1 ? "s" : ""} conectada{connectedCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Platform Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {platforms.map(p => {
          const conn = social.getConnection(p.key);
          const isConnected = conn?.token_status === "active";
          const isExpired = conn?.token_status === "expired";
          const needsFb = p.requiresFb && !social.fbConnection;

          return (
            <Card key={p.key} className={`shadow-card hover:shadow-lg transition-all duration-300 ${isConnected ? p.borderColor : "border-border/50"} ${isConnected ? "border-2" : ""}`}>
              <CardContent className="p-5 space-y-4">
                {/* Platform header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </div>
                </div>

                {/* Status section */}
                {!p.available ? (
                  <div className="text-center py-3">
                    <Badge variant="outline" className="text-muted-foreground">Próximamente</Badge>
                  </div>
                ) : !conn ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4" />
                      <span>No conectado</span>
                    </div>
                    {needsFb && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                        Requiere Facebook Page conectada previamente
                      </p>
                    )}
                    <Button
                      onClick={() => p.key === "facebook" ? setShowFbWizard(true) : setShowIgWizard(true)}
                      disabled={needsFb}
                      className="w-full gap-2 gradient-primary text-primary-foreground"
                    >
                      <Link2 className="w-4 h-4" /> Conectar {p.name.split(" ")[0]}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Connected info */}
                    <div className="bg-muted/30 rounded-xl p-3 space-y-2 border border-border/50">
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Conectado
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" /> Token expirado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" /> {conn.token_status}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Nombre:</span> {conn.platform_name}</p>
                        <p><span className="font-medium text-foreground">{p.key === "instagram" ? "IG Business ID" : "Page ID"}:</span> {conn.platform_account_id.slice(0, 8)}...{conn.platform_account_id.slice(-4)}</p>
                        <p><span className="font-medium text-foreground">Token:</span> {maskToken(conn.access_token)}</p>
                        {conn.token_last_verified_at && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Último check:</span>
                            {formatDistanceToNow(new Date(conn.token_last_verified_at), { locale: es, addSuffix: true })}
                            {isConnected && <CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" />}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1.5"
                        onClick={() => handleVerify(conn.id)}
                        disabled={verifyingId === conn.id}
                      >
                        {verifyingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        Verificar Token
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1.5"
                        onClick={() => setTestConnection(conn)}
                      >
                        <FlaskConical className="w-3.5 h-3.5" /> Publicación de prueba
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => social.disconnectPlatform(conn.id)}
                      >
                        <Unplug className="w-3.5 h-3.5" /> Desconectar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Wizards */}
      <FacebookWizard
        open={showFbWizard}
        onOpenChange={setShowFbWizard}
        social={social}
        onConnectInstagram={() => setShowIgWizard(true)}
      />
      <InstagramWizard
        open={showIgWizard}
        onOpenChange={setShowIgWizard}
        social={social}
      />

      {/* Test Publish Modal */}
      {testConnection && (
        <TestPublishModal
          open={!!testConnection}
          onOpenChange={(open) => { if (!open) setTestConnection(null); }}
          connection={testConnection}
          onPublish={social.testPublish}
        />
      )}
    </div>
  );
};

export default SocialMediaSection;
