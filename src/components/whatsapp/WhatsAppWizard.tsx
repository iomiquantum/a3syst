import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, ExternalLink, Smartphone, PartyPopper, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const STEPS = [
  "Bienvenida",
  "Conectar Meta",
  "Confirmar número",
  "Coexistencia",
  "¡Listo!",
];

const META_APP_ID = import.meta.env.VITE_META_APP_ID || "850630404695074";
const EMBEDDED_SIGNUP_CONFIG_ID = "2004354673836449";

const WhatsAppWizard = () => {
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const [step, setStep] = useState(0);

  // Step 0
  const [checks, setChecks] = useState([false, false, false]);

  // Step 1 - Embedded Signup
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Step 2 - Confirm (auto-filled from signup)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [coexistence, setCoexistence] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleCheck = (i: number) => {
    setChecks(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const allChecked = checks.every(Boolean);

  // Load Facebook SDK
  const loadFacebookSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.FB) {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v22.0",
        });
        resolve();
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v22.0",
        });
        resolve();
      };

      const existing = document.getElementById("facebook-jssdk");
      if (existing) existing.remove();

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/es_LA/sdk.js";
      script.async = true;
      script.onerror = () => reject(new Error("No se pudo cargar el SDK de Facebook"));
      document.body.appendChild(script);

      setTimeout(() => reject(new Error("Tiempo de espera agotado cargando Facebook SDK")), 15000);
    });
  }, []);

  // Handle Embedded Signup
  const handleEmbeddedSignup = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);

    try {
      await loadFacebookSDK();

      // FB.login with Embedded Signup params
      const response: any = await new Promise((resolve, reject) => {
        window.FB.login(
          (response: any) => {
            if (response.authResponse) {
              resolve(response);
            } else {
              reject(new Error("Autorización cancelada por el usuario"));
            }
          },
          {
            config_id: EMBEDDED_SIGNUP_CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              feature: "whatsapp_embedded_signup",
              sessionInfoVersion: 2,
            },
          }
        );
      });

      const code = response.authResponse.code;

      // Extract session info (waba_id, phone_number_id) from the response
      let extractedWabaId = "";
      let extractedPhoneNumberId = "";

      // The Embedded Signup returns session info in authResponse
      if (response.authResponse.declinedPermissions) {
        console.warn("Declined permissions:", response.authResponse.declinedPermissions);
      }

      // Try to get session info from the response
      // Meta Embedded Signup v2 includes sessionInfo in the response
      const sessionInfo = response.authResponse?.sessionInfo || response.authResponse;
      
      // For sessionInfoVersion: 2, the data comes via the message event
      // But we also try to extract from authResponse directly
      if (sessionInfo) {
        extractedWabaId = sessionInfo.waba_id || sessionInfo.wabaId || "";
        extractedPhoneNumberId = sessionInfo.phone_number_id || sessionInfo.phoneNumberId || "";
      }

      // Call edge function to exchange code for permanent token
      toast.loading("Conectando con WhatsApp Business...", { id: "wa-connect" });

      const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
        body: {
          code,
          waba_id: extractedWabaId,
          phone_number_id: extractedPhoneNumberId,
          clinic_id: clinicId,
        },
      });

      toast.dismiss("wa-connect");

      if (error) throw new Error(error.message || "Error en la conexión");
      if (data?.error) throw new Error(data.error);

      // Success - pre-fill step 2
      setPhoneNumber(data.phone_number || "");
      setDisplayName(data.display_name || "");
      setWabaId(data.waba_id || extractedWabaId);
      setPhoneNumberId(data.phone_number_id || extractedPhoneNumberId);

      toast.success("¡Conexión exitosa con WhatsApp Business!");
      setStep(2); // Go to confirm step

    } catch (err: any) {
      const msg = err.message || "Error al conectar con Facebook";
      setConnectError(msg);
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  }, [loadFacebookSDK, clinicId]);

  // Listen for Embedded Signup message events (sessionInfoVersion: 2)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.data?.waba_id) setWabaId(data.data.waba_id);
          if (data.data?.phone_number_id) setPhoneNumberId(data.data.phone_number_id);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Step 2: Update coexistence setting
  const handleConfirm = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      await (supabase as any)
        .from("whatsapp_connections")
        .update({ coexistence_enabled: coexistence })
        .eq("clinic_id", clinicId)
        .eq("status", "active");
      
      setStep(3); // Go to coexistence instructions
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    setStep(4);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  i <= step ? "bg-primary" : "bg-transparent"
                )}
                style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              i <= step ? "text-primary" : "text-muted-foreground/40"
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 0: Welcome */}
      {step === 0 && (
        <Card className="border-[#25d366]/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[#25d366]/20 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-[#25d366]/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-4 rounded-full bg-[#25d366] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Conecta tu WhatsApp Business</h2>
              <p className="text-muted-foreground mt-2">
                Tu número funcionará en tu celular <strong>Y</strong> en a3syst al mismo tiempo
              </p>
            </div>

            <div className="space-y-3 text-left max-w-sm mx-auto">
              {[
                "Tengo WhatsApp Business App instalada",
                "Tengo acceso a mi cuenta de Facebook Business",
                "Mi número está activo hace más de 7 días",
              ].map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    checks[i]
                      ? "border-[#25d366]/50 bg-[#25d366]/10"
                      : "border-border bg-muted/30 hover:border-border/80"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                    checks[i] ? "bg-[#25d366]" : "border border-muted-foreground/30"
                  )}>
                    {checks[i] && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-sm",
                    checks[i] ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStep(1)}
              disabled={!allChecked}
              className="bg-[#25d366] hover:bg-[#25d366]/90 text-white px-8"
            >
              Comenzar conexión →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 1: Embedded Signup */}
      {step === 1 && (
        <Card className="border-blue-500/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-blue-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Conecta tu cuenta de WhatsApp Business</h2>
              <p className="text-muted-foreground mt-2">
                Se abrirá una ventana de Facebook donde podrás autorizar y registrar tu número de WhatsApp Business directamente.
              </p>
            </div>

            {connectError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive max-w-md mx-auto">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{connectError}</span>
              </div>
            )}

            {connecting ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-muted-foreground">Procesando conexión...</span>
                <span className="text-xs text-muted-foreground/60">Completa el registro en la ventana de Facebook</span>
              </div>
            ) : (
              <Button
                onClick={handleEmbeddedSignup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                size="lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Conectar con Facebook
              </Button>
            )}

            <div className="text-xs text-muted-foreground/60 max-w-sm mx-auto">
              <p>Al conectar, se creará automáticamente tu cuenta de WhatsApp Business API vinculada a tu número.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Confirm Number (auto-filled) */}
      {step === 2 && (
        <Card className="border-primary/20">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Confirma tu conexión</h2>
              <p className="text-muted-foreground mt-2">Tu número de WhatsApp Business ha sido registrado</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              {/* Connection details */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Número:</span>
                  <span className="text-sm font-semibold text-foreground">{phoneNumber || "Obteniendo..."}</span>
                </div>
                {displayName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nombre:</span>
                    <span className="text-sm font-semibold text-foreground">{displayName}</span>
                  </div>
                )}
                {wabaId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">WABA ID:</span>
                    <span className="text-xs font-mono text-muted-foreground">{wabaId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <span className="text-sm font-semibold text-[#25d366]">✅ Conectado</span>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
                <Checkbox
                  checked={coexistence}
                  onCheckedChange={(v) => setCoexistence(!!v)}
                />
                <div>
                  <p className="text-sm text-foreground">Seguir usando WhatsApp Business App en mi celular</p>
                  <p className="text-xs text-muted-foreground">Modo coexistencia activado</p>
                </div>
              </label>

              <Button
                onClick={handleConfirm}
                disabled={saving}
                className="w-full bg-[#25d366] hover:bg-[#25d366]/90 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Coexistence instructions */}
      {step === 3 && (
        <Card className="border-[#25d366]/20">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-[#25d366] mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Activa la coexistencia en tu celular</h2>
              <p className="text-muted-foreground mt-2">Para usar WhatsApp en tu celular y en a3syst al mismo tiempo</p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              {[
                { num: "1️⃣", text: "Abre WhatsApp Business en tu celular" },
                { num: "2️⃣", text: "Ve a Configuración → Dispositivos vinculados" },
                { num: "3️⃣", text: 'Toca "Vincular dispositivo"' },
                { num: "4️⃣", text: "Tu número ya está vinculado con la API" },
              ].map((inst, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <span className="text-lg">{inst.num}</span>
                  <span className="text-sm text-foreground">{inst.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              <Button
                onClick={handleFinish}
                className="bg-[#25d366] hover:bg-[#25d366]/90 text-white"
              >
                Entendido, continuar ✓
              </Button>
              <Button
                onClick={handleFinish}
                variant="ghost"
                className="text-muted-foreground"
              >
                Omitir por ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Success */}
      {step === 4 && (
        <Card className="border-[#25d366]/30 overflow-hidden">
          <CardContent className="p-8 text-center space-y-6 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: i % 2 === 0 ? "#25d366" : "hsl(var(--primary))",
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.4 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>

            <div className="relative">
              <PartyPopper className="w-16 h-16 text-[#25d366] mx-auto" />
            </div>

            <Card className="border-[#25d366]/20 bg-muted/30 max-w-sm mx-auto">
              <CardContent className="p-6 space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="text-foreground font-semibold">WhatsApp conectado exitosamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="text-muted-foreground text-sm">
                    Número: {phoneNumber || displayName || "Configurado"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-muted-foreground text-sm">
                    Coexistencia: {coexistence ? "Activa" : "No configurada"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 max-w-sm mx-auto relative">
              <Button
                onClick={() => navigate("/mensajes/whatsapp")}
                className="bg-[#25d366] hover:bg-[#25d366]/90 text-white"
              >
                Ir a mis mensajes
              </Button>
              <Button
                onClick={() => navigate("/configuracion/agente-ia")}
                variant="outline"
              >
                Configurar respuestas automáticas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppWizard;
