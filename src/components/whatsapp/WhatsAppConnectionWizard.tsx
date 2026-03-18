import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { Check, X, ExternalLink, Copy, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, PartyPopper, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "wa-wizard-data";
const STEPS = 5;

interface WizardData {
  appId: string;
  appName: string;
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  businessName: string;
  accessToken: string;
  verifiedData: { phone_number?: string; business_name?: string; quality_rating?: string } | null;
  webhookVerifyToken: string;
  webhookUrl: string;
  connectionId: string;
}

const defaultData: WizardData = {
  appId: "", appName: "", wabaId: "", phoneNumberId: "",
  phoneNumber: "", businessName: "", accessToken: "",
  verifiedData: null, webhookVerifyToken: "", webhookUrl: "",
  connectionId: "",
};

const WhatsAppConnectionWizard = ({ open, onOpenChange }: Props) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
    } catch { return defaultData; }
  });
  const [verifying, setVerifying] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [webhookConfirmed, setWebhookConfirmed] = useState(false);
  const { addConnection } = useWhatsAppConnections();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = (field: keyof WizardData, value: string) => {
    setData((d) => ({ ...d, [field]: value }));
  };

  const isValidAppId = data.appId.length >= 10 && /^\d+$/.test(data.appId);
  const isValidWabaId = data.wabaId.length >= 10 && /^\d+$/.test(data.wabaId);
  const isValidPhoneNumberId = data.phoneNumberId.length >= 10 && /^\d+$/.test(data.phoneNumberId);
  const isValidPhone = data.phoneNumber.startsWith("+") && data.phoneNumber.length >= 8;
  const isValidName = data.businessName.length >= 2;
  const isValidToken = data.accessToken.startsWith("EAA") && data.accessToken.length > 50;

  const canNext1 = isValidAppId;
  const canNext2 = isValidWabaId && isValidPhoneNumberId && isValidPhone && isValidName;
  const canVerify = isValidToken;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("whatsapp-verify-connection", {
        body: { phone_number_id: data.phoneNumberId, access_token: data.accessToken },
      });
      if (error) throw error;
      if (!result?.success) {
        toast.error(result?.error || "Credenciales inválidas");
        return;
      }
      const verifiedData = {
        phone_number: result.phone_number,
        business_name: result.business_name,
        quality_rating: result.quality_rating,
      };
      update("verifiedData" as any, verifiedData as any);
      setData((d) => ({ ...d, verifiedData }));
      toast.success(`✅ Conexión verificada: ${result.business_name} — ${result.phone_number}`);

      // Create the connection
      const conn = await addConnection({
        meta_app_id: data.appId,
        meta_app_name: data.appName,
        waba_id: data.wabaId,
        phone_number_id: data.phoneNumberId,
        display_phone_number: result.phone_number || data.phoneNumber,
        business_name: result.business_name || data.businessName,
        access_token: data.accessToken,
        quality_rating: result.quality_rating,
      });

      if (conn) {
        setData((d) => ({
          ...d,
          connectionId: conn.id,
          webhookVerifyToken: conn.webhook_verify_token || "",
          webhookUrl: conn.webhook_url || `https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/whatsapp-webhook`,
        }));
        setStep(4);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al verificar");
    } finally {
      setVerifying(false);
    }
  };

  const handleFinish = async () => {
    if (data.connectionId) {
      await (supabase as any).from("whatsapp_connections").update({ status: "active", webhook_configured: true }).eq("id", data.connectionId);
    }
    localStorage.removeItem(STORAGE_KEY);
    setStep(5);
  };

  const handleGoToInbox = () => {
    onOpenChange(false);
    setData(defaultData);
    setStep(1);
    navigate("/whatsapp");
  };

  const handleReset = () => {
    setData(defaultData);
    setStep(1);
    setWebhookConfirmed(false);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("✅ Copiado");
  };

  const ValidationIcon = ({ valid }: { valid: boolean }) => (
    valid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-400" />
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">📱 Paso 1: Abre tu App en Meta for Developers</h3>
              <p className="text-sm text-muted-foreground mt-1">Vamos a conectar el WhatsApp de tu negocio a a3syst.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">①</Badge>
                <div className="space-y-2 flex-1">
                  <p className="text-sm">Abre Meta for Developers en una nueva pestaña:</p>
                  <Button variant="default" className="w-full" onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                    Abrir Meta for Developers <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">②</Badge>
                <p className="text-sm">Haz clic en la app de tu negocio</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">③</Badge>
                <div className="space-y-2 flex-1">
                  <p className="text-sm">Copia el "Identificador de la app" que aparece arriba en la barra gris</p>
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-primary hover:underline">📍 ¿Dónde lo encuentro?</CollapsibleTrigger>
                    <CollapsibleContent className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                      Está en la barra gris de arriba, junto al nombre de tu app. Es un número largo.
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="relative">
                    <Input
                      placeholder="ej. 1416611766827408"
                      value={data.appId}
                      onChange={(e) => update("appId", e.target.value.replace(/\D/g, ""))}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ValidationIcon valid={isValidAppId} />
                    </div>
                  </div>
                  <Label className="text-xs text-muted-foreground">Identificador de la App (App ID) *</Label>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">④</Badge>
                <div className="space-y-2 flex-1">
                  <p className="text-sm">Escribe el nombre de tu app (para identificarla)</p>
                  <Input
                    placeholder="ej. vitalfarme-app"
                    value={data.appName}
                    onChange={(e) => update("appName", e.target.value)}
                  />
                  <Label className="text-xs text-muted-foreground">Nombre de la app (opcional)</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canNext1}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">📋 Paso 2: Datos de WhatsApp Business</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">①</Badge>
                <p className="text-sm">En Meta for Developers, con tu app abierta, haz clic en "WhatsApp" en el menú de la izquierda</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">②</Badge>
                <div className="space-y-2 flex-1">
                  <p className="text-sm">Haz clic en "Prueba de API"</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://developers.facebook.com/apps/${data.appId}/whatsapp-business/wa-dev-console/`, "_blank")}>
                    Ir a Prueba de API <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">③</Badge>
                <p className="text-sm">Selecciona tu número REAL (no el de prueba)</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-xs">
                ⚠️ Si solo ves "Test Number", tu número real puede tener un WABA ID diferente. Ve al Administrador de WhatsApp Business para buscarlo.
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">④</Badge>
                <div className="space-y-3 flex-1">
                  <p className="text-sm">Copia los dos identificadores:</p>
                  <div className="space-y-1">
                    <div className="relative">
                      <Input placeholder="ej. 1293043446187443" value={data.wabaId} onChange={(e) => update("wabaId", e.target.value.replace(/\D/g, ""))} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2"><ValidationIcon valid={isValidWabaId} /></div>
                    </div>
                    <Label className="text-xs text-muted-foreground">ID de Cuenta de WhatsApp Business (WABA ID) *</Label>
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <Input placeholder="ej. 1015576141630486" value={data.phoneNumberId} onChange={(e) => update("phoneNumberId", e.target.value.replace(/\D/g, ""))} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2"><ValidationIcon valid={isValidPhoneNumberId} /></div>
                    </div>
                    <Label className="text-xs text-muted-foreground">ID del Número de Teléfono (Phone Number ID) *</Label>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">⑤</Badge>
                <div className="space-y-3 flex-1">
                  <p className="text-sm">Ingresa tu número y nombre del negocio:</p>
                  <div className="space-y-1">
                    <div className="relative">
                      <Input type="tel" placeholder="+593 95 865 3377" value={data.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2"><ValidationIcon valid={isValidPhone} /></div>
                    </div>
                    <Label className="text-xs text-muted-foreground">Número de WhatsApp *</Label>
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <Input placeholder="ej. Vital Farme Ecuador" value={data.businessName} onChange={(e) => update("businessName", e.target.value)} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2"><ValidationIcon valid={isValidName} /></div>
                    </div>
                    <Label className="text-xs text-muted-foreground">Nombre del negocio *</Label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Atrás</Button>
              <Button onClick={() => setStep(3)} disabled={!canNext2}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">🔑 Paso 3: Token de Acceso</h3>
            </div>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold">⚡ OPCIÓN RÁPIDA (para probar ahora):</p>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">①</Badge>
                  <p className="text-sm">En "Prueba de API", haz clic en "Generar token de acceso"</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">②</Badge>
                  <p className="text-sm">Acepta todos los permisos que te pida Facebook</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">③</Badge>
                  <p className="text-sm">Copia el token (cadena larga que empieza con "EAA...")</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs">
                  ⚠️ Este token expira en ~60 minutos. Para uso permanente, sigue la opción de abajo.
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold">🔒 OPCIÓN PERMANENTE (recomendada):</p>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">①</Badge>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm">Ve al Administrador de WhatsApp Business</p>
                    <Button variant="outline" size="sm" onClick={() => window.open("https://business.facebook.com/settings/whatsapp-business-accounts", "_blank")}>
                      Abrir Administrador <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">②</Badge>
                  <p className="text-sm">En el menú izquierdo, ve a Configuración &gt; Configuración de la API</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">③</Badge>
                  <p className="text-sm">Genera un token permanente seleccionando tu cuenta</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>🔑 Access Token *</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    placeholder="EAAG..."
                    value={data.accessToken}
                    onChange={(e) => update("accessToken", e.target.value.trim())}
                  />
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <ValidationIcon valid={isValidToken} />
                  </div>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isValidToken ? "✅ Formato válido" : "El token debe empezar con 'EAA' y tener más de 50 caracteres"}
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Atrás</Button>
              <Button onClick={handleVerify} disabled={!canVerify || verifying}>
                {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando...</> : <>Verificar Conexión <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">🔗 Paso 4: Configura el Webhook</h3>
              <p className="text-sm text-muted-foreground mt-1">¡Casi listo! Solo falta decirle a Meta que envíe los mensajes a a3syst.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">①</Badge>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">Abre la configuración de webhooks:</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://developers.facebook.com/apps/${data.appId}/whatsapp-business/wa-settings/`, "_blank")}>
                    Abrir Configuración <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">②</Badge>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">En "URL de devolución de llamada", pega esta URL:</p>
                  <div className="flex gap-2">
                    <Input readOnly value={data.webhookUrl} className="font-mono text-xs bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(data.webhookUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">③</Badge>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">En "Token de verificación", pega este token:</p>
                  <div className="flex gap-2">
                    <Input readOnly value={data.webhookVerifyToken} className="font-mono text-xs bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(data.webhookVerifyToken)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">④</Badge>
                <p className="text-sm">Haz clic en "Verificar y guardar" en Meta</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">⑤</Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">Suscríbete al campo "messages":</p>
                  <p className="text-xs text-muted-foreground">Debajo de "Campos del webhook", busca "messages" y activa el toggle de "Suscribirse"</p>
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 text-xs text-red-700 dark:text-red-300">
                    ⚠️ IMPORTANTE: Sin esta suscripción, NO recibirás los mensajes.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="webhook-confirmed"
                  checked={webhookConfirmed}
                  onCheckedChange={(c) => setWebhookConfirmed(!!c)}
                />
                <label htmlFor="webhook-confirmed" className="text-sm cursor-pointer">
                  ✅ Ya configuré el webhook y me suscribí a messages
                </label>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="h-4 w-4 mr-1" /> Atrás</Button>
              <Button onClick={handleFinish} disabled={!webhookConfirmed}>
                Finalizar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <PartyPopper className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-2xl font-bold">🎉 ¡WhatsApp Conectado!</h3>
              <p className="text-muted-foreground mt-1">
                {data.verifiedData?.phone_number || data.phoneNumber} — {data.verifiedData?.business_name || data.businessName}
              </p>
            </div>
            <div className="text-left space-y-2 bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm">✅ App de Meta configurada</p>
              <p className="text-sm">✅ Credenciales verificadas</p>
              <p className="text-sm">✅ Webhook conectado</p>
              <p className="text-sm">✅ Suscripción a mensajes activa</p>
            </div>
            <div className="text-left space-y-2 bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm font-semibold">¿Qué puedes hacer ahora?</p>
              <p className="text-xs text-muted-foreground">💬 Ver y responder mensajes de clientes</p>
              <p className="text-xs text-muted-foreground">📤 Enviar mensajes y templates de WhatsApp</p>
              <p className="text-xs text-muted-foreground">📊 Ver el historial de conversaciones</p>
              <p className="text-xs text-muted-foreground">🔔 Recibir notificaciones de nuevos mensajes</p>
            </div>
            <div className="space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={handleGoToInbox}>
                <MessageCircle className="h-5 w-5 mr-2" /> Ir al Inbox de WhatsApp
              </Button>
              <button className="text-sm text-primary hover:underline" onClick={handleReset}>
                Conectar otro número
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Conectar WhatsApp Business
          </DialogTitle>
        </DialogHeader>
        {step < 5 && (
          <div className="space-y-1 mb-2">
            <Progress value={(step / STEPS) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">Paso {step} de {STEPS}</p>
          </div>
        )}
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppConnectionWizard;
