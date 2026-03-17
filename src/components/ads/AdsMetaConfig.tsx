import { useState } from "react";
import { Settings2, CheckCircle2, Unplug, Save, Eye, EyeOff, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useAds } from "@/hooks/useAds";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

interface Props { ads: ReturnType<typeof useAds>; }

const AdsMetaConfig = ({ ads }: Props) => {
  const { businessId } = useBusiness();
  const account = ads.accounts.find(a => a.platform === "meta");
  const cfg = (account?.config || {}) as Record<string, string>;
  const creds = (account?.credentials || {}) as Record<string, string>;

  // Config fields
  const [fbPage, setFbPage] = useState(cfg.fb_page || "");
  const [igAccount, setIgAccount] = useState(cfg.ig_account || "");
  const [webUrl, setWebUrl] = useState(cfg.web_url || "");

  // Credential fields (the real tokens)
  const [pageAccessToken, setPageAccessToken] = useState(creds.access_token || "");
  const [pageId, setPageId] = useState(creds.page_id || "");
  const [igAccountId, setIgAccountId] = useState(creds.ig_account_id || "");

  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; pageName?: string; igName?: string } | null>(null);

  const validateToken = async () => {
    if (!pageAccessToken) { toast.error("Ingresa un Page Access Token"); return; }
    setValidating(true);
    setValidationResult(null);
    try {
      // Validate token by fetching page info
      const pageRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account{id,username}&access_token=${pageAccessToken}`);
      const pageData = await pageRes.json();
      
      if (pageData.error) {
        toast.error(`Token inválido: ${pageData.error.message}`);
        setValidationResult({ valid: false });
        return;
      }

      // Auto-fill page ID
      if (pageData.id && !pageId) setPageId(pageData.id);
      
      // Auto-fill IG account ID
      if (pageData.instagram_business_account?.id && !igAccountId) {
        setIgAccountId(pageData.instagram_business_account.id);
      }

      setValidationResult({
        valid: true,
        pageName: pageData.name,
        igName: pageData.instagram_business_account?.username,
      });
      toast.success(`Token válido — Página: ${pageData.name}`);
    } catch (err) {
      toast.error("Error validando el token");
      setValidationResult({ valid: false });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!pageAccessToken || !pageId) {
      toast.error("El Page Access Token y el Page ID son obligatorios");
      return;
    }
    setSaving(true);
    const config = { fb_page: fbPage, ig_account: igAccount, web_url: webUrl };
    const credentials = { access_token: pageAccessToken, page_id: pageId, ig_account_id: igAccountId };
    await ads.upsertAccount("meta", {
      status: "connected",
      config,
      credentials,
      connected_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (account) await ads.disconnectAccount(account.id);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Configuración de Meta Ads</h2>
            <p className="text-sm text-muted-foreground">Conecta tu cuenta para publicar en Facebook e Instagram</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !pageAccessToken || !pageId} className="gradient-primary text-primary-foreground shadow-md" size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>

      {/* Credenciales de acceso */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Credenciales de Meta</p>
                <p className="text-sm text-muted-foreground">Token de acceso para publicar en tus páginas</p>
              </div>
            </div>
            <Badge variant="destructive" className="font-semibold">Obligatorio</Badge>
          </div>

          {/* Help text */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> ¿Cómo obtener tu Page Access Token?
            </p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>Ve a <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-0.5">Graph API Explorer <ExternalLink className="w-3 h-3" /></a></li>
              <li>Selecciona tu App y solicita los permisos: <code className="bg-muted px-1 rounded">pages_manage_posts</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code>, <code className="bg-muted px-1 rounded">instagram_basic</code>, <code className="bg-muted px-1 rounded">instagram_content_publish</code></li>
              <li>Genera el token y selecciona tu Página</li>
              <li>Convierte a token de larga duración en <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-0.5">Access Token Debugger <ExternalLink className="w-3 h-3" /></a></li>
            </ol>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page Access Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={pageAccessToken}
                    onChange={e => setPageAccessToken(e.target.value)}
                    placeholder="EAAGm0PX4ZCps..."
                    className="h-11 pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={validateToken} disabled={validating || !pageAccessToken} className="h-11">
                  {validating ? "Validando..." : "Validar Token"}
                </Button>
              </div>
              {validationResult?.valid && (
                <p className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Token válido{validationResult.pageName && ` — ${validationResult.pageName}`}
                  {validationResult.igName && ` | @${validationResult.igName}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page ID (Facebook)</Label>
                <Input
                  value={pageId}
                  onChange={e => setPageId(e.target.value)}
                  placeholder="123456789..."
                  className="h-11 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Se auto-completa al validar el token</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instagram Business Account ID</Label>
                <Input
                  value={igAccountId}
                  onChange={e => setIgAccountId(e.target.value)}
                  placeholder="17841..."
                  className="h-11 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Se auto-completa si la Página tiene IG vinculado</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información complementaria */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground">Información adicional</p>
              <p className="text-sm text-muted-foreground">Datos opcionales para personalizar tus campañas</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre de Página de Facebook</Label>
              <Input value={fbPage} onChange={e => setFbPage(e.target.value)} placeholder="Mi Negocio" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuenta de Instagram</Label>
              <Input value={igAccount} onChange={e => setIgAccount(e.target.value)} placeholder="@minegocio" className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL del Sitio Web <span className="normal-case font-normal">(opcional)</span></Label>
            <Input value={webUrl} onChange={e => setWebUrl(e.target.value)} placeholder="https://tusitio.com" className="h-11" />
          </div>
        </CardContent>
      </Card>

      {/* Desconectar */}
      {account && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">Desconectar cuenta de Meta</p>
          <Button variant="outline" onClick={handleDisconnect} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <Unplug className="w-4 h-4 mr-2" /> Desconectar
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdsMetaConfig;
