import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, ExternalLink, QrCode, Smartphone, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  "Bienvenida",
  "Conectar Meta",
  "Confirmar número",
  "Coexistencia",
  "¡Listo!",
];

const COUNTRY_CODES = [
  { code: "+593", country: "Ecuador 🇪🇨", flag: "🇪🇨" },
  { code: "+52", country: "México 🇲🇽", flag: "🇲🇽" },
  { code: "+57", country: "Colombia 🇨🇴", flag: "🇨🇴" },
  { code: "+54", country: "Argentina 🇦🇷", flag: "🇦🇷" },
  { code: "+56", country: "Chile 🇨🇱", flag: "🇨🇱" },
  { code: "+51", country: "Perú 🇵🇪", flag: "🇵🇪" },
  { code: "+1", country: "USA 🇺🇸", flag: "🇺🇸" },
  { code: "+34", country: "España 🇪🇸", flag: "🇪🇸" },
];

const META_APP_ID = import.meta.env.VITE_META_APP_ID || "850630404695074";

const WhatsAppWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clinicId } = useClinic();
  const [step, setStep] = useState(0);

  // Step 1
  const [checks, setChecks] = useState([false, false, false]);

  // Step 2
  const [connecting, setConnecting] = useState(false);

  // Step 3
  const [countryCode, setCountryCode] = useState("+593");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [coexistence, setCoexistence] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 4
  const [countdown, setCountdown] = useState(60);
  const [scanned, setScanned] = useState(false);

  // Handle OAuth redirect
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && step < 2) {
      setStep(2);
      toast.success("¡Facebook conectado exitosamente!");
    }
  }, [searchParams]);

  // Countdown timer for step 4
  useEffect(() => {
    if (step !== 3 || countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const toggleCheck = (i: number) => {
    setChecks(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const allChecked = checks.every(Boolean);

  const handleFacebookLogin = () => {
    setConnecting(true);
    const redirectUri = encodeURIComponent(window.location.origin + "/configuracion/whatsapp");
    const scope = encodeURIComponent("whatsapp_business_management,whatsapp_business_messaging,business_management");
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    window.location.href = url;
  };

  const handleConfirmNumber = async () => {
    if (!clinicId || !phoneNumber.trim()) {
      toast.error("Ingresa un número de teléfono");
      return;
    }
    setSaving(true);
    try {
      const fullNumber = countryCode + phoneNumber.replace(/\D/g, "");
      const { error } = await (supabase as any).from("whatsapp_connections").insert({
        clinic_id: clinicId,
        waba_id: "",
        phone_number_id: "",
        phone_number: fullNumber,
        display_name: fullNumber,
        status: "pending",
        coexistence_enabled: coexistence,
        access_token: "",
        connected_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Número registrado");
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleScanComplete = async () => {
    setScanned(true);
    // Update connection status
    if (clinicId) {
      await (supabase as any)
        .from("whatsapp_connections")
        .update({ status: "active" })
        .eq("clinic_id", clinicId)
        .eq("status", "pending");
    }
    setStep(4);
  };

  const handleSkipCoexistence = () => {
    setStep(4);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#1a1a2e]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  i <= step ? "bg-[#7c3aed]" : "bg-transparent"
                )}
                style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              i <= step ? "text-[#7c3aed]" : "text-muted-foreground/40"
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 0: Welcome */}
      {step === 0 && (
        <Card className="border-[#25d366]/20 bg-[#111118]">
          <CardContent className="p-8 text-center space-y-6">
            {/* WhatsApp icon with glow */}
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
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                    checks[i] ? "bg-[#25d366]" : "border border-white/20"
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

      {/* STEP 1: Connect Meta */}
      {step === 1 && (
        <Card className="border-blue-500/20 bg-[#111118]">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-blue-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Conecta tu cuenta de Facebook Business</h2>
              <p className="text-muted-foreground mt-2">
                Necesitamos acceso a tu cuenta de Meta para conectar WhatsApp Business
              </p>
            </div>

            {connecting ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-muted-foreground">Conectando...</span>
              </div>
            ) : (
              <Button
                onClick={handleFacebookLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Conectar con Facebook
              </Button>
            )}

            <button
              onClick={() => setStep(2)}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Omitir por ahora (modo manual)
            </button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Confirm Number */}
      {step === 2 && (
        <Card className="border-[#7c3aed]/20 bg-[#111118]">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-[#7c3aed] mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">¿Cuál es tu número de WhatsApp Business?</h2>
              <p className="text-muted-foreground mt-2">Ingresa el número que quieres conectar</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[140px] bg-[#0a0a0f] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(cc => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="999 123 456"
                  className="flex-1 bg-[#0a0a0f] border-white/10"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer">
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
                onClick={handleConfirmNumber}
                disabled={!phoneNumber.trim() || saving}
                className="w-full bg-[#7c3aed] hover:bg-[#7c3aed]/90 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmar y conectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Coexistence / QR */}
      {step === 3 && (
        <Card className="border-[#25d366]/20 bg-[#111118]">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <QrCode className="w-12 h-12 text-[#25d366] mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-foreground">Activa WhatsApp en tu celular</h2>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              {[
                { num: "1️⃣", text: "Abre WhatsApp Business en tu celular" },
                { num: "2️⃣", text: "Ve a Configuración → Dispositivos vinculados" },
                { num: "3️⃣", text: "Toca \"Vincular dispositivo\"" },
                { num: "4️⃣", text: "Escanea el código QR" },
              ].map((inst, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <span className="text-lg">{inst.num}</span>
                  <span className="text-sm text-foreground">{inst.text}</span>
                </div>
              ))}
            </div>

            {/* QR Placeholder */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl bg-[#25d366]/20 animate-pulse" />
                <div className="relative w-48 h-48 rounded-xl border-2 border-[#25d366]/40 bg-[#0a0a0f] flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-[#25d366]/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">QR Placeholder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center">
              <span className={cn(
                "text-sm font-mono",
                countdown <= 10 ? "text-red-400" : "text-muted-foreground"
              )}>
                {countdown > 0 ? `Expira en ${countdown}s` : "Código expirado — recarga la página"}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              <Button
                onClick={handleScanComplete}
                className="bg-[#25d366] hover:bg-[#25d366]/90 text-white"
              >
                Ya escaneé el código ✓
              </Button>
              <Button
                onClick={handleSkipCoexistence}
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
        <Card className="border-[#25d366]/30 bg-[#111118] overflow-hidden">
          <CardContent className="p-8 text-center space-y-6 relative">
            {/* Decorative particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: i % 2 === 0 ? "#25d366" : "#7c3aed",
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

            <Card className="border-[#25d366]/20 bg-white/[0.03] max-w-sm mx-auto">
              <CardContent className="p-6 space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="text-foreground font-semibold">WhatsApp conectado exitosamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="text-muted-foreground text-sm">
                    Número: {countryCode}{phoneNumber || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-muted-foreground text-sm">
                    Coexistencia: {scanned ? "Activa" : "No configurada"}
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
                className="border-white/10"
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
