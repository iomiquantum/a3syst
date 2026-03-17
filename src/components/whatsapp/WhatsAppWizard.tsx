import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, ExternalLink, Smartphone, PartyPopper,
  AlertTriangle, ChevronDown, Clock, HelpCircle, Shield, MessageCircleQuestion,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const STEPS = ["Bienvenida", "Conectar Meta", "Confirmar número", "Coexistencia", "¡Listo!"];

const META_APP_ID = import.meta.env.VITE_META_APP_ID || "850630404695074";
const EMBEDDED_SIGNUP_CONFIG_ID = "2004354673836449";

/* ─── Checklist items data ─── */
const CHECKLIST_ITEMS = [
  {
    title: "WhatsApp Business App instalada",
    description:
      "Necesitas la app de WhatsApp Business (no WhatsApp normal) instalada en tu celular con tu número de negocio activo.",
    example: "📱 Descárgala gratis en App Store o Google Play buscando 'WhatsApp Business'",
  },
  {
    title: "Cuenta de Facebook Business",
    description:
      "Necesitas una cuenta de Facebook personal Y un Portfolio Comercial (antes llamado Facebook Business Manager) asociado a tu negocio.",
    example:
      "💡 Si tienes una página de Facebook para tu negocio, probablemente ya tienes esto. Ve a business.facebook.com para verificarlo.",
    link: { label: "¿Cómo crear un Portfolio Comercial? →", href: "https://business.facebook.com" },
  },
  {
    title: "Número de WhatsApp activo hace más de 7 días",
    description:
      "Tu número debe haber estado activo en WhatsApp Business por al menos 7 días antes de poder conectarlo a la API.",
    example: "✅ Si ya usas WhatsApp Business normalmente, esto ya está listo.",
  },
  {
    title: "Número no conectado a otra plataforma",
    description:
      "Si tu número ya está conectado a ManyChat, Respond.io u otra plataforma similar, primero debes desconectarlo de ahí.",
    example: "🔄 Si solo usas WhatsApp Business normal en tu celular, esto no aplica para ti.",
  },
];

/* ─── Step time estimates ─── */
const STEP_TIME = ["~2 minutos", "~2 minutos", "~30 segundos", "~1 minuto", ""];

/* ─── Step indicator ─── */
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center gap-0 w-full">
    {STEPS.map((label, i) => {
      const isCompleted = i < currentStep;
      const isActive = i === currentStep;
      const isPending = i > currentStep;
      return (
        <div key={label} className="flex-1 flex flex-col items-center gap-1.5 relative">
          {i > 0 && (
            <div
              className={cn(
                "absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors duration-300",
                isCompleted || isActive ? "bg-primary" : "bg-border"
              )}
            />
          )}
          <div
            className={cn(
              "relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border-2",
              isCompleted && "bg-primary border-primary text-primary-foreground",
              isActive && "bg-background border-primary text-primary shadow-md shadow-primary/20",
              isPending && "bg-muted border-border text-muted-foreground"
            )}
          >
            {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors text-center leading-tight",
              isCompleted && "text-primary",
              isActive && "text-primary font-semibold",
              isPending && "text-muted-foreground"
            )}
          >
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

/* ─── Floating help button ─── */
const FloatingHelp = () => (
  <button
    onClick={() =>
      window.open(
        "https://wa.me/message/SUPPORT",
        "_blank"
      )
    }
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
  >
    <MessageCircleQuestion className="w-4 h-4" />
    ¿Tienes dudas?
  </button>
);

/* ─── Expandable checklist card ─── */
const ChecklistCard = ({
  item,
  checked,
  onToggle,
}: {
  item: (typeof CHECKLIST_ITEMS)[number];
  checked: boolean;
  onToggle: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-xl border transition-all overflow-hidden",
          checked ? "border-primary/50 bg-primary/5" : "border-border bg-card"
        )}
      >
        {/* Header row */}
        <div className="flex items-center gap-3 p-3.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
              checked ? "bg-primary" : "border border-border hover:border-primary/50"
            )}
          >
            {checked && <Check className="w-3 h-3 text-primary-foreground" />}
          </button>

          <span className={cn("text-sm flex-1 font-medium", checked ? "text-foreground" : "text-foreground/80")}>
            {item.title}
          </span>

          <CollapsibleTrigger asChild>
            <button className="p-1 rounded-md hover:bg-accent transition-colors">
              <ChevronDown
                className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="px-3.5 pb-4 pt-0 space-y-2.5 ml-8">
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            <p className="text-xs text-muted-foreground/80 bg-muted/50 rounded-lg p-2.5 leading-relaxed">
              {item.example}
            </p>
            {item.link && (
              <a
                href={item.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {item.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

/* ═══════════════════════════════════════ */
/*              MAIN WIZARD               */
/* ═══════════════════════════════════════ */
const WhatsAppWizard = () => {
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const [step, setStep] = useState(0);

  // Step 0 – 4 checks now
  const [checks, setChecks] = useState([false, false, false, false]);

  // Step 1 - Embedded Signup
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Step 2 - Confirm
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [coexistence, setCoexistence] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleCheck = (i: number) => setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const allChecked = checks.every(Boolean);

  /* ─── Facebook SDK ─── */
  const loadFacebookSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.FB) {
        window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: false, version: "v22.0" });
        resolve();
        return;
      }
      window.fbAsyncInit = function () {
        window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: false, version: "v22.0" });
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

  /* ─── Embedded Signup ─── */
  const handleEmbeddedSignup = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);
    setPopupBlocked(false);
    try {
      await loadFacebookSDK();
      const response: any = await new Promise((resolve, reject) => {
        window.FB.login(
          (response: any) => {
            if (response.authResponse) resolve(response);
            else reject(new Error("Autorización cancelada. Si no viste la ventana, tu navegador puede haberla bloqueado."));
          },
          {
            config_id: EMBEDDED_SIGNUP_CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: 2 },
          }
        );
      });

      const code = response.authResponse.code;
      let extractedWabaId = "";
      let extractedPhoneNumberId = "";

      const sessionInfo = response.authResponse?.sessionInfo || response.authResponse;
      if (sessionInfo) {
        extractedWabaId = sessionInfo.waba_id || sessionInfo.wabaId || "";
        extractedPhoneNumberId = sessionInfo.phone_number_id || sessionInfo.phoneNumberId || "";
      }

      toast.loading("Conectando con WhatsApp Business...", { id: "wa-connect" });
      const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
        body: { code, waba_id: extractedWabaId, phone_number_id: extractedPhoneNumberId, clinic_id: clinicId },
      });
      toast.dismiss("wa-connect");

      if (error) throw new Error(error.message || "Error en la conexión");
      if (data?.error) throw new Error(data.error);

      setPhoneNumber(data.phone_number || "");
      setDisplayName(data.display_name || "");
      setWabaId(data.waba_id || extractedWabaId);
      setPhoneNumberId(data.phone_number_id || extractedPhoneNumberId);
      toast.success("¡Conexión exitosa con WhatsApp Business!");
      setStep(2);
    } catch (err: any) {
      const msg = err.message || "Hubo un problema al conectar. Intenta de nuevo.";
      if (msg.includes("bloqueado") || msg.includes("cancelada")) {
        setPopupBlocked(true);
      }
      setConnectError(msg);
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  }, [loadFacebookSDK, clinicId]);

  /* ─── WA Embedded Signup message listener ─── */
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
        /* Ignore non-JSON */
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConfirm = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      await (supabase as any)
        .from("whatsapp_connections")
        .update({ coexistence_enabled: coexistence })
        .eq("clinic_id", clinicId)
        .eq("status", "active");
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => setStep(4);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* Progress */}
      <StepIndicator currentStep={step} />

      {/* Time estimate badge */}
      {STEP_TIME[step] && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Este paso toma {STEP_TIME[step]}</span>
        </div>
      )}

      {/* ═══ STEP 0: Welcome / Pre-flight checklist ═══ */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-[#25d366]/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-[#25d366]/25 animate-pulse" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-3 rounded-full bg-[#25d366] flex items-center justify-center shadow-lg shadow-[#25d366]/30">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground">Conecta tu WhatsApp Business</h2>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Tu número funcionará en tu celular <strong className="text-foreground">Y</strong> en a3syst al mismo tiempo.
                  Verifica que cumples con estos requisitos antes de comenzar.
                </p>
              </div>
            </div>

            {/* Pre-flight checklist */}
            <div className="space-y-2.5 max-w-md mx-auto">
              {CHECKLIST_ITEMS.map((item, i) => (
                <ChecklistCard key={i} item={item} checked={checks[i]} onToggle={() => toggleCheck(i)} />
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
              <Button
                onClick={() => setStep(1)}
                disabled={!allChecked}
                className="w-full bg-[#25d366] hover:bg-[#25d366]/90 text-white disabled:opacity-40"
                size="lg"
              >
                Estoy listo, conectar WhatsApp →
              </Button>

              <button
                onClick={() =>
                  window.open("https://wa.me/message/SUPPORT", "_blank")
                }
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                ¿Necesitas ayuda con algún requisito?
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 1: Connect with Facebook ═══ */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <ExternalLink className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Conecta tu cuenta de WhatsApp Business</h2>
            </div>

            {/* What will happen info banner */}
            <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                📋 Lo que va a pasar:
              </p>
              <ol className="space-y-2 ml-1">
                {[
                  "Se abrirá una ventana de Facebook",
                  "Inicias sesión con tu cuenta personal de Facebook",
                  "Seleccionas tu Portfolio Comercial",
                  "Seleccionas tu número de WhatsApp Business",
                  "Autorizas a a3syst para gestionar tus mensajes",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground/70 pt-1 border-t border-border/50">
                Todo el proceso toma menos de 2 minutos.
              </p>
            </div>

            {/* Error state */}
            {connectError && (
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
                {popupBlocked && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Tu navegador bloqueó la ventana emergente</p>
                      <p className="text-xs opacity-80">
                        Haz clic en el botón de abajo para intentar de nuevo, o permite las ventanas emergentes en la
                        configuración de tu navegador.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Facebook button */}
            <div className="flex flex-col items-center gap-3">
              {connecting ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm">Procesando conexión...</span>
                  <span className="text-xs text-muted-foreground">Completa el registro en la ventana de Facebook</span>
                </div>
              ) : (
                <Button onClick={handleEmbeddedSignup} size="lg" className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-8">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {popupBlocked ? "Intentar de nuevo" : "Conectar con Facebook"}
                </Button>
              )}

              {/* Privacy note */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-sm text-center">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                a3syst nunca tendrá acceso a tu contraseña de Facebook ni a tus mensajes personales.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 2: Confirm Number ═══ */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Confirma tu conexión</h2>
              <p className="text-muted-foreground mt-2 text-sm">Tu número de WhatsApp Business ha sido registrado</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
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

              <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-accent transition-colors">
                <Checkbox checked={coexistence} onCheckedChange={(v) => setCoexistence(!!v)} />
                <div>
                  <p className="text-sm text-foreground">Seguir usando WhatsApp Business App en mi celular</p>
                  <p className="text-xs text-muted-foreground">Modo coexistencia activado</p>
                </div>
              </label>

              <Button onClick={handleConfirm} disabled={saving} className="w-full bg-[#25d366] hover:bg-[#25d366]/90 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 3: Coexistence ═══ */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-[#25d366] mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Activa la coexistencia en tu celular</h2>
              <p className="text-muted-foreground mt-2 text-sm">Para usar WhatsApp en tu celular y en a3syst al mismo tiempo</p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              {[
                { num: "1️⃣", text: "Abre WhatsApp Business en tu celular" },
                { num: "2️⃣", text: "Ve a Configuración → Dispositivos vinculados" },
                { num: "3️⃣", text: 'Toca "Vincular dispositivo"' },
                { num: "4️⃣", text: "Tu número ya está vinculado con la API" },
              ].map((inst, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-lg">{inst.num}</span>
                  <span className="text-sm text-foreground">{inst.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              <Button onClick={handleFinish} className="bg-[#25d366] hover:bg-[#25d366]/90 text-white">
                Entendido, continuar ✓
              </Button>
              <Button onClick={handleFinish} variant="ghost" className="text-muted-foreground">
                Omitir por ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 4: Success ═══ */}
      {step === 4 && (
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center space-y-6 relative">
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
                    opacity: 0.3 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>

            <div className="relative">
              <PartyPopper className="w-16 h-16 text-[#25d366] mx-auto" />
            </div>

            <div className="relative border border-border rounded-xl bg-muted/40 max-w-sm mx-auto p-6 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-foreground font-semibold">WhatsApp conectado exitosamente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <span className="text-muted-foreground text-sm">Número: {phoneNumber || displayName || "Configurado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                <span className="text-muted-foreground text-sm">Coexistencia: {coexistence ? "Activa" : "No configurada"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto relative">
              <Button onClick={() => navigate("/mensajes/whatsapp")} className="bg-[#25d366] hover:bg-[#25d366]/90 text-white">
                Ir a mis mensajes
              </Button>
              <Button onClick={() => navigate("/configuracion/agente-ia")} variant="outline">
                Configurar respuestas automáticas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating help – visible on all steps except success */}
      {step < 4 && <FloatingHelp />}
    </div>
  );
};

export default WhatsAppWizard;
