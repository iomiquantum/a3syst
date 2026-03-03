import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Upload, Plus, Trash2, Sparkles, Zap,
  Copy, ExternalLink, MessageCircle, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ─── */
interface ServiceItem {
  name: string;
  price: string;
  duration: string;
  description: string;
}

/* ─── Constants ─── */
const BUSINESS_TYPES = [
  { value: "clinica", emoji: "🏥", label: "Clínica / Consultorio médico" },
  { value: "spa", emoji: "💆", label: "Spa / Centro de bienestar" },
  { value: "estudio", emoji: "🧘", label: "Estudio (yoga, pilates, fitness)" },
  { value: "dental", emoji: "🦷", label: "Consultorio dental" },
  { value: "psicologia", emoji: "🧠", label: "Consultorio psicológico" },
  { value: "farmacia", emoji: "💊", label: "Farmacia / Tienda de salud" },
  { value: "tienda", emoji: "🛍️", label: "Tienda / Comercio" },
  { value: "servicios", emoji: "💼", label: "Servicios profesionales" },
  { value: "otro", emoji: "📦", label: "Otro" },
];

const DURATIONS = ["15min", "30min", "45min", "1h", "1h30", "2h", "N/A"];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const SERVICE_PLACEHOLDERS: Record<string, string> = {
  clinica: "Ej: Consulta general",
  spa: "Ej: Masaje relajante 60min",
  dental: "Ej: Limpieza dental profunda",
  tienda: "Ej: Crema hidratante premium",
  servicios: "Ej: Consultoría de marketing digital",
};

const TONES = [
  { value: "friendly", emoji: "😊", label: "Amigable y cercano" },
  { value: "professional", emoji: "👔", label: "Profesional y formal" },
  { value: "enthusiastic", emoji: "🌟", label: "Entusiasta y motivador" },
  { value: "calm", emoji: "🧘", label: "Calmado y empático" },
];

const AI_CAPABILITIES = [
  { id: "services", label: "Responder preguntas sobre servicios y precios", default: true },
  { id: "hours", label: "Informar horarios y ubicación", default: true },
  { id: "appointments", label: "Agendar citas", default: true },
  { id: "recommendations", label: "Dar recomendaciones personalizadas", default: false },
  { id: "promotions", label: "Enviar promociones", default: false },
  { id: "english", label: "Responder en inglés también", default: false },
];

const emptyService = (): ServiceItem => ({ name: "", price: "", duration: "30min", description: "" });

/* ─── Component ─── */
const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clinicId, refreshClinic } = useClinic();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [openingHour, setOpeningHour] = useState("09:00");
  const [closingHour, setClosingHour] = useState("18:00");
  const [workingDays, setWorkingDays] = useState(["Lun", "Mar", "Mié", "Jue", "Vie"]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Step 2
  const [services, setServices] = useState<ServiceItem[]>([emptyService(), emptyService()]);

  // Step 3
  const [agentName, setAgentName] = useState("Ana");
  const [tone, setTone] = useState("friendly");
  const [capabilities, setCapabilities] = useState<string[]>(
    AI_CAPABILITIES.filter(c => c.default).map(c => c.id)
  );
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Step 4
  const [slug, setSlug] = useState("");

  const toggleDay = (day: string) => {
    setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleCapability = (id: string) => {
    setCapabilities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const addService = () => {
    if (services.length < 5) setServices([...services, emptyService()]);
  };

  const removeService = (i: number) => {
    if (services.length > 2) setServices(services.filter((_, idx) => idx !== i));
  };

  const updateService = (i: number, field: keyof ServiceItem, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  /* ── Save functions ── */
  const saveStep1 = async () => {
    if (!businessName.trim()) { toast.error("Ingresa el nombre de tu negocio"); return false; }
    if (!businessType) { toast.error("Selecciona el tipo de negocio"); return false; }
    if (!description.trim()) { toast.error("Describe tu negocio brevemente"); return false; }
    if (!clinicId) { toast.error("Error interno"); return false; }

    setSaving(true);
    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${clinicId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("clinic-logos").upload(path, logoFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("clinic-logos").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }
    }

    // Generate slug
    const { data: slugData } = await supabase.rpc("generate_clinic_slug", { clinic_name: businessName.trim() });

    const { error } = await supabase.from("clinics").update({
      name: businessName.trim(),
      business_type: businessType,
      description: description.trim(),
      city: city.trim(),
      whatsapp: whatsapp.trim(),
      opening_hour: openingHour,
      closing_hour: closingHour,
      working_days: workingDays,
      slug: slugData || businessName.toLowerCase().replace(/\s+/g, "-"),
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    } as any).eq("id", clinicId);

    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    setSlug(slugData || "");
    return true;
  };

  const saveStep2 = async () => {
    const valid = services.filter(s => s.name.trim());
    if (valid.length < 2) { toast.error("Agrega al menos 2 servicios"); return false; }
    if (!clinicId) return false;

    setSaving(true);
    const rows = valid.map(s => ({
      clinic_id: clinicId,
      name: s.name.trim(),
      price: parseFloat(s.price) || 0,
      duration: parseInt(s.duration) || 30,
      description: s.description.trim(),
    }));
    const { error } = await supabase.from("treatments").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const saveStep3 = async () => {
    if (!agentName.trim()) { toast.error("Dale un nombre a tu asistente"); return false; }
    if (!clinicId) return false;

    setSaving(true);
    const { error } = await supabase.from("ai_agent_config").upsert({
      clinic_id: clinicId,
      agent_name: agentName.trim(),
      tone,
      greeting: `¡Hola! 👋 Soy ${agentName}, asistente virtual de ${businessName}. ¿En qué puedo ayudarte?`,
      enabled: true,
      objective: "Atender clientes y agendar citas",
      language: "es",
      services: capabilities as any,
      special_instructions: additionalInfo.trim(),
    }, { onConflict: "clinic_id" });

    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const handleNext = async () => {
    let success = true;
    if (step === 0) success = await saveStep1();
    else if (step === 1) success = await saveStep2();
    else if (step === 2) success = await saveStep3();
    if (success) setStep(s => s + 1);
  };

  const handleFinish = async () => {
    if (!clinicId) return;
    await supabase.from("clinics").update({ onboarding_completed: true } as any).eq("id", clinicId);
    refreshClinic();
    navigate("/dashboard");
  };

  const landingUrl = `${window.location.origin}/negocio/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(landingUrl);
    toast.success("¡Link copiado!");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mira mi negocio! ${landingUrl}`)}`, "_blank");
  };

  const placeholder = SERVICE_PLACEHOLDERS[businessType] || "Ej: Servicio principal";
  const showDuration = !["tienda", "farmacia"].includes(businessType);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress */}
      {step < 4 && (
        <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Paso {step + 1} de 4</span>
              <span className="text-xs text-muted-foreground">{Math.round(((step + 1) / 4) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              {["Negocio", "Servicios", "Asistente IA", "¡Listo!"].map((label, i) => (
                <span key={i} className={`text-[10px] ${i <= step ? "text-primary" : "text-muted-foreground/40"}`}>
                  {i < step ? "✅ " : ""}{label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">

          {/* ═══ STEP 1: BUSINESS ═══ */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Cuéntanos de tu negocio</h2>
                <p className="text-muted-foreground mt-1">Esto nos ayuda a personalizar todo para ti</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre de tu negocio *</label>
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ej: Clínica Bella Vita" maxLength={100} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo de negocio *</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUSINESS_TYPES.map(bt => (
                    <button key={bt.value} onClick={() => setBusinessType(bt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs ${
                        businessType === bt.value ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/30"
                      }`}>
                      <span className="text-xl">{bt.emoji}</span>
                      <span className="text-center leading-tight">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Describe tu negocio *</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Somos una clínica de estética facial y corporal especializada en tratamientos no invasivos para mujeres de 25-55 años"
                  rows={3} maxLength={500} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ciudad / Ubicación</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Ej: Quito, Ecuador" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">WhatsApp del negocio</label>
                  <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+593 99 123 4567" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hora apertura</label>
                  <Select value={openingHour} onValueChange={setOpeningHour}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hora cierre</label>
                  <Select value={closingHour} onValueChange={setClosingHour}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Días de atención</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d} onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        workingDays.includes(d) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}>{d}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Logo (opcional)</label>
                <label className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border bg-card cursor-pointer hover:border-primary/30 transition-all">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">{logoPreview ? "Cambiar logo" : "Subir logo"}</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: SERVICES ═══ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">¿Qué ofreces?</h2>
                <p className="text-muted-foreground mt-1">Mínimo 2, máximo 5. Después podrás agregar más.</p>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {services.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3 relative">
                    {services.length > 2 && (
                      <button onClick={() => removeService(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Input value={s.name} onChange={e => updateService(i, "name", e.target.value)}
                      placeholder={placeholder} maxLength={100} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" value={s.price} onChange={e => updateService(i, "price", e.target.value)}
                        placeholder="$50.00" min="0" step="0.01" />
                      {showDuration && (
                        <Select value={s.duration} onValueChange={v => updateService(i, "duration", v)}>
                          <SelectTrigger><SelectValue placeholder="Duración" /></SelectTrigger>
                          <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <Textarea value={s.description} onChange={e => updateService(i, "description", e.target.value)}
                      placeholder="Describe brevemente qué incluye" rows={2} maxLength={300} />
                  </div>
                ))}
              </div>

              {services.length < 5 && (
                <Button variant="outline" className="w-full" onClick={addService}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar otro
                </Button>
              )}
            </div>
          )}

          {/* ═══ STEP 3: AI ASSISTANT ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Tu asistente IA</h2>
                <p className="text-muted-foreground mt-1">Esta IA responderá preguntas sobre tu negocio 24/7</p>
              </div>

              {/* Chat preview */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">{agentName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agentName || "Ana"}</p>
                    <p className="text-[10px] text-emerald-500">● En línea</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-primary/10 text-foreground text-xs p-2.5 rounded-lg rounded-tl-none max-w-[80%]">
                    ¡Hola! 👋 Soy {agentName || "Ana"}, asistente de {businessName || "tu negocio"}. ¿En qué puedo ayudarte?
                  </div>
                  <div className="bg-muted text-foreground text-xs p-2.5 rounded-lg rounded-tr-none max-w-[80%] ml-auto">
                    ¿Qué servicios ofrecen?
                  </div>
                  <div className="bg-primary/10 text-foreground text-xs p-2.5 rounded-lg rounded-tl-none max-w-[80%]">
                    ¡Con gusto! Ofrecemos {services.filter(s => s.name).map(s => s.name).join(", ") || "varios servicios"}. ¿Te interesa alguno en particular? 😊
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre del asistente</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Ej: Ana" maxLength={50} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tono de comunicación</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map(t => (
                    <button key={t.value} onClick={() => setTone(t.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                        tone === t.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                      }`}>
                      <span className="text-lg">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">¿Qué debe hacer tu asistente?</label>
                <div className="space-y-2">
                  {AI_CAPABILITIES.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30 transition-all">
                      <Checkbox checked={capabilities.includes(c.id)} onCheckedChange={() => toggleCapability(c.id)} />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Información adicional (opcional)</label>
                <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)}
                  placeholder="Ej: Aceptamos tarjeta y efectivo. Estacionamiento gratuito." rows={3} maxLength={1000} />
              </div>
            </div>
          )}

          {/* ═══ STEP 4: DONE ═══ */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold">¡Tu landing page ya está en línea!</h2>
              <p className="text-muted-foreground">Comparte este link con tus clientes y tu asistente IA empezará a responder</p>

              {/* URL */}
              <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
                <input readOnly value={landingUrl} className="flex-1 text-sm bg-transparent border-none outline-none text-foreground" />
                <Button size="sm" variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.open(`/negocio/${slug}`, "_blank")} variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" /> Ver mi landing page
                </Button>
                <Button onClick={shareWhatsApp} variant="outline" className="text-emerald-600">
                  <MessageCircle className="w-4 h-4 mr-2" /> Compartir por WhatsApp
                </Button>
              </div>

              <Button onClick={handleFinish} size="lg" className="mt-6">
                Ir al panel de control <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ═══ NAVIGATION ═══ */}
          {step < 3 && (
            <div className="flex justify-between mt-8 pb-8">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={saving}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                </Button>
              ) : <div />}
              <Button onClick={handleNext} disabled={saving}>
                {saving ? "Guardando..." : "Siguiente"} {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
