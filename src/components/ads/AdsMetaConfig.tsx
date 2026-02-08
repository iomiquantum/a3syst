import { useState } from "react";
import { Settings2, CheckCircle2, Save, Unplug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const AdsMetaConfig = () => {
  const [businessManager, setBusinessManager] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [fbPage, setFbPage] = useState("");
  const [igAccount, setIgAccount] = useState("");
  const [waAccount, setWaAccount] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [fbPixel, setFbPixel] = useState("");

  const handleSave = () => {
    toast.success("Configuración de Meta Ads guardada correctamente");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Configuración de Meta Ads</h2>
            <p className="text-sm text-muted-foreground">Configura tu integración con Meta Ads</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Guardar Configuración
        </Button>
      </div>

      {/* Activos publicitarios */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Activos publicitarios</p>
                <p className="text-sm text-muted-foreground">Define desde qué cuenta se gestionan los anuncios</p>
              </div>
            </div>
            <Badge variant="destructive">Obligatorio</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activos publicitarios</Label>
              <Select value={businessManager} onValueChange={setBusinessManager}>
                <SelectTrigger><SelectValue placeholder="Buscar Business Managers..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bm1">Mi Business Manager</SelectItem>
                  <SelectItem value="bm2">Business Manager 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seleccionar Cuenta Publicitaria</Label>
              <Select value={adAccount} onValueChange={setAdAccount}>
                <SelectTrigger><SelectValue placeholder="Buscar Cuentas Publicitarias..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acc1">Cuenta Publicitaria 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canales de redes sociales */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Canales de Redes Sociales</p>
                <p className="text-sm text-muted-foreground">Selecciona los canales en los que quieres publicar tus anuncios</p>
              </div>
            </div>
            <Badge variant="destructive">Obligatorio</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Página de Facebook</Label>
              <Select value={fbPage} onValueChange={setFbPage}>
                <SelectTrigger><SelectValue placeholder="Seleccionar una Página de Facebook" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page1">Mi Página de Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta de Instagram</Label>
              <Select value={igAccount} onValueChange={setIgAccount}>
                <SelectTrigger><SelectValue placeholder="Seleccionar una cuenta de Instagram" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ig1">Mi cuenta de Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Business <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select value={waAccount} onValueChange={setWaAccount}>
                <SelectTrigger><SelectValue placeholder="Seleccionar una cuenta de WhatsApp Business" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wa1">Mi WhatsApp Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canal Web */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Canal Web</p>
                <p className="text-sm text-muted-foreground">Agrega estos datos si publicarás anuncios para web</p>
              </div>
            </div>
            <Badge variant="outline">Opcional</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL del Sitio Web</Label>
              <Input value={webUrl} onChange={e => setWebUrl(e.target.value)} placeholder="https://tusitio.com" />
            </div>
            <div className="space-y-2">
              <Label>Pixel de Facebook</Label>
              <Select value={fbPixel} onValueChange={setFbPixel}>
                <SelectTrigger><SelectValue placeholder="Seleccionar un Pixel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="px1">Mi Pixel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!webUrl && (
            <p className="text-xs text-destructive">Ingresa una URL de sitio web para habilitar la selección de pixel</p>
          )}
        </CardContent>
      </Card>

      {/* Desconectar */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">Desconectar cuenta de Meta</p>
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <Unplug className="w-4 h-4 mr-1.5" /> Desconectar
        </Button>
      </div>
    </div>
  );
};

export default AdsMetaConfig;
