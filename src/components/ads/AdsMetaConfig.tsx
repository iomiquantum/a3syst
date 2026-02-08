import { useState } from "react";
import { Settings2, CheckCircle2, Unplug, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useAds } from "@/hooks/useAds";

interface Props { ads: ReturnType<typeof useAds>; }

const AdsMetaConfig = ({ ads }: Props) => {
  const account = ads.accounts.find(a => a.platform === "meta");
  const cfg = (account?.config || {}) as Record<string, string>;

  const [businessManager, setBusinessManager] = useState(cfg.business_manager || "");
  const [adAccount, setAdAccount] = useState(cfg.ad_account || "");
  const [fbPage, setFbPage] = useState(cfg.fb_page || "");
  const [igAccount, setIgAccount] = useState(cfg.ig_account || "");
  const [waAccount, setWaAccount] = useState(cfg.wa_account || "");
  const [webUrl, setWebUrl] = useState(cfg.web_url || "");
  const [fbPixel, setFbPixel] = useState(cfg.fb_pixel || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const config = { business_manager: businessManager, ad_account: adAccount, fb_page: fbPage, ig_account: igAccount, wa_account: waAccount, web_url: webUrl, fb_pixel: fbPixel };
    await ads.upsertAccount("meta", { status: "connected", config, connected_at: new Date().toISOString() });
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
            <p className="text-sm text-muted-foreground">Configura tu integración con Meta Ads</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground shadow-md" size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>

      {/* Activos publicitarios */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Settings2 className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="font-bold text-foreground">Activos publicitarios</p>
                <p className="text-sm text-muted-foreground">Define desde qué cuenta se gestionan los anuncios</p>
              </div>
            </div>
            <Badge variant="destructive" className="font-semibold">Obligatorio</Badge>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activos publicitarios</Label>
              <Select value={businessManager} onValueChange={setBusinessManager}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Buscar Business Managers..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bm_default">Mi Business Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seleccionar Cuenta Publicitaria</Label>
              <Select value={adAccount} onValueChange={setAdAccount}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Buscar Cuentas Publicitarias..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acc_default">Cuenta Publicitaria Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canales de Redes Sociales */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Settings2 className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="font-bold text-foreground">Canales de Redes Sociales</p>
                <p className="text-sm text-muted-foreground">Selecciona los canales en los que quieres publicar tus anuncios</p>
              </div>
            </div>
            <Badge variant="destructive" className="font-semibold">Obligatorio</Badge>
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Página de Facebook</Label>
              <Select value={fbPage} onValueChange={setFbPage}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar Página..." /></SelectTrigger>
                <SelectContent><SelectItem value="page_default">Mi Página</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuenta de Instagram</Label>
              <Select value={igAccount} onValueChange={setIgAccount}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
                <SelectContent><SelectItem value="ig_default">Mi Instagram</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Business <span className="normal-case font-normal">(opcional)</span></Label>
              <Select value={waAccount} onValueChange={setWaAccount}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
                <SelectContent><SelectItem value="wa_default">Mi WhatsApp</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canal Web */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Settings2 className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="font-bold text-foreground">Canal Web</p>
                <p className="text-sm text-muted-foreground">Agrega estos datos si publicarás anuncios para web</p>
              </div>
            </div>
            <Badge variant="outline" className="font-semibold">Opcional</Badge>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL del Sitio Web</Label>
              <Input value={webUrl} onChange={e => setWebUrl(e.target.value)} placeholder="https://tusitio.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pixel de Facebook</Label>
              <Select value={fbPixel} onValueChange={setFbPixel}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar un Pixel" /></SelectTrigger>
                <SelectContent><SelectItem value="px_default">Mi Pixel</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {!webUrl && <p className="text-xs text-destructive">Ingresa una URL de sitio web para habilitar la selección de pixel</p>}
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
