import { useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Unplug, ShieldCheck, FlaskConical, Loader2, Instagram } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocialConnections, type SocialConnection } from "@/hooks/useSocialConnections";
import { useFacebookAuth, type FacebookPage } from "@/hooks/useFacebookAuth";
import { useMetaAppConfig } from "@/hooks/useMetaAppConfig";
import TestPublishModal from "./TestPublishModal";
import PageSelectorModal from "./PageSelectorModal";
import MetaAppModeSelector from "./MetaAppModeSelector";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const SocialMediaSection = () => {
  const social = useSocialConnections();
  const metaConfig = useMetaAppConfig();
  const fbAuth = useFacebookAuth();

  const [showPageSelector, setShowPageSelector] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [testConnection, setTestConnection] = useState<SocialConnection | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fbConn = social.fbConnection;
  const igConn = social.igConnection;
  const connectedCount = social.connections.filter((c) => c.token_status === "active").length;

  // Handle "Connect Facebook" click
  const handleConnectFacebook = async () => {
    const pages = await fbAuth.loginWithFacebook();
    if (pages.length === 1) {
      // Auto-select if only one page
      await handleSelectPage(pages[0]);
    } else if (pages.length > 1) {
      setShowPageSelector(true);
    }
  };

  // Handle page selection and save
  const handleSelectPage = async (page: FacebookPage) => {
    setSavingConnection(true);

    // Save Facebook connection
    const fbOk = await social.saveConnection({
      platform: "facebook",
      platform_name: page.page_name,
      platform_account_id: page.page_id,
      access_token: page.page_access_token,
      metadata: {
        picture: page.page_picture,
        ig_linked: !!page.instagram,
        ig_username: page.instagram?.username || null,
      },
    });

    // If page has Instagram, save that too
    if (fbOk && page.instagram) {
      await social.saveConnection({
        platform: "instagram",
        platform_name: `@${page.instagram.username}`,
        platform_account_id: page.instagram.id,
        access_token: page.page_access_token,
        metadata: {
          username: page.instagram.username,
          profile_picture: page.instagram.profile_picture_url,
          linked_facebook_page: page.page_name,
          linked_page_id: page.page_id,
        },
      });
    }

    setSavingConnection(false);
    setShowPageSelector(false);
    fbAuth.reset();
  };

  const handleVerify = async (connId: string) => {
    setVerifyingId(connId);
    await social.verifyToken(connId);
    setVerifyingId(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Link2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">
            Conexiones de Redes Sociales
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecta tus cuentas con un clic para publicar automáticamente desde a3syst
          </p>
        </div>
        <Badge
          variant={connectedCount > 0 ? "default" : "outline"}
          className={
            connectedCount > 0
              ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
              : ""
          }
        >
          {connectedCount} cuenta{connectedCount !== 1 ? "s" : ""} conectada
          {connectedCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Meta App Mode Selector */}
      <MetaAppModeSelector metaConfig={metaConfig} />

      {/* Platform Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* ─── Facebook Card ─── */}
        <Card
          className={`shadow-card hover:shadow-lg transition-all duration-300 ${
            fbConn?.token_status === "active"
              ? "border-2 border-[#1877F2]/30"
              : "border-border/50"
          }`}
        >
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0 text-2xl">
                  📘
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Facebook Page</h3>
                  <p className="text-xs text-muted-foreground">
                    Publica contenido automáticamente en tu página
                  </p>
                </div>
              </div>
            </div>

            {!fbConn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>No conectado</span>
                </div>
                <Button
                  onClick={handleConnectFacebook}
                  disabled={fbAuth.loading}
                  className="w-full gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-semibold"
                >
                  {fbAuth.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Conectando...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" /> Conectar Facebook
                    </>
                  )}
                </Button>
                {fbAuth.error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fbAuth.error}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  Solo necesitas hacer clic y autorizar. Sin pasos técnicos.
                </p>
              </div>
            ) : (
              <ConnectedInfo
                conn={fbConn}
                label="Page ID"
                onVerify={() => handleVerify(fbConn.id)}
                verifying={verifyingId === fbConn.id}
                onTest={() => setTestConnection(fbConn)}
                onDisconnect={() => social.disconnectPlatform(fbConn.id)}
              />
            )}
          </CardContent>
        </Card>

        {/* ─── Instagram Card ─── */}
        <Card
          className={`shadow-card hover:shadow-lg transition-all duration-300 ${
            igConn?.token_status === "active"
              ? "border-2 border-purple-500/30"
              : "border-border/50"
          }`}
        >
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 flex items-center justify-center shrink-0">
                  <Instagram className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Instagram Business</h3>
                  <p className="text-xs text-muted-foreground">
                    Se conecta automáticamente al vincular tu Facebook
                  </p>
                </div>
              </div>
            </div>

            {!igConn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>No conectado</span>
                </div>
                {fbConn ? (
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Tu Facebook está conectado pero no tiene un Instagram Business vinculado.
                      Para conectarlo:
                    </p>
                    <ol className="text-xs text-muted-foreground mt-2 ml-4 list-decimal space-y-1">
                      <li>
                        Ve a tu{" "}
                        <a
                          href="https://www.facebook.com/settings/?tab=linked_instagram"
                          target="_blank"
                          rel="noopener"
                          className="text-primary hover:underline"
                        >
                          Facebook → Configuración → Instagram
                        </a>
                      </li>
                      <li>Vincula tu cuenta de Instagram Business</li>
                      <li>Vuelve aquí y reconecta Facebook</li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                    Conecta Facebook primero — Instagram se vinculará automáticamente si
                    está asociado a tu página.
                  </p>
                )}
              </div>
            ) : (
              <ConnectedInfo
                conn={igConn}
                label="IG Business ID"
                onVerify={() => handleVerify(igConn.id)}
                verifying={verifyingId === igConn.id}
                onTest={() => setTestConnection(igConn)}
                onDisconnect={() => social.disconnectPlatform(igConn.id)}
              />
            )}
          </CardContent>
        </Card>

        {/* ─── Coming Soon Cards ─── */}
        {[
          { name: "TikTok Business", icon: "🎵", color: "bg-black/5 text-foreground" },
          { name: "LinkedIn", icon: "💼", color: "bg-[#0A66C2]/10 text-[#0A66C2]" },
        ].map((p) => (
          <Card key={p.name} className="shadow-card border-border/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl ${p.color}`}
                >
                  {p.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">Próximamente</p>
                </div>
              </div>
              <div className="text-center py-3">
                <Badge variant="outline" className="text-muted-foreground">
                  Próximamente
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Page Selector Modal */}
      <PageSelectorModal
        open={showPageSelector}
        onOpenChange={(open) => {
          if (!open) {
            setShowPageSelector(false);
            fbAuth.reset();
          }
        }}
        pages={fbAuth.pages}
        onSelect={handleSelectPage}
        saving={savingConnection}
      />

      {/* Test Publish Modal */}
      {testConnection && (
        <TestPublishModal
          open={!!testConnection}
          onOpenChange={(open) => {
            if (!open) setTestConnection(null);
          }}
          connection={testConnection}
          onPublish={social.testPublish}
        />
      )}
    </div>
  );
};

// ─── Connected Info Sub-component ───
const ConnectedInfo = ({
  conn,
  label,
  onVerify,
  verifying,
  onTest,
  onDisconnect,
}: {
  conn: SocialConnection;
  label: string;
  onVerify: () => void;
  verifying: boolean;
  onTest: () => void;
  onDisconnect: () => void;
}) => {
  const isConnected = conn.token_status === "active";
  const isExpired = conn.token_status === "expired";

  return (
    <div className="space-y-3">
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
              {conn.token_status}
            </Badge>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Nombre:</span>{" "}
            {conn.platform_name}
          </p>
          <p>
            <span className="font-medium text-foreground">{label}:</span>{" "}
            {conn.platform_account_id.slice(0, 8)}...
            {conn.platform_account_id.slice(-4)}
          </p>
          {conn.token_last_verified_at && (
            <p className="flex items-center gap-1">
              <span className="font-medium text-foreground">Último check:</span>
              {formatDistanceToNow(new Date(conn.token_last_verified_at), {
                locale: es,
                addSuffix: true,
              })}
              {isConnected && (
                <CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" />
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={onVerify}
          disabled={verifying}
        >
          {verifying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          Verificar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={onTest}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Prueba
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onDisconnect}
        >
          <Unplug className="w-3.5 h-3.5" /> Desconectar
        </Button>
      </div>
    </div>
  );
};

export default SocialMediaSection;
