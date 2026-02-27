import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Check, Upload, Plus, Trash2, Sparkles, Zap,
  SmilePlus, Scissors, Heart, Stethoscope, Brain, Dog, Package, Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ─── */
interface Service { name: string; duration: number; price: number; }
interface Professional { full_name: string; email: string; specialty: string; }

/* ─── Service templates ─── */
const SERVICE_TEMPLATES: Record<string, Service[]> = {
  dental: [
    { name: "Limpieza dental", duration: 30, price: 30 },
    { name: "Blanqueamiento", duration: 60, price: 150 },
    { name: "Extracción", duration: 45, price: 80 },
    { name: "Ortodoncia consulta", duration: 30, price: 50 },
    { name: "Relleno/empaste", duration: 40, price: 60 },
    { name: "Endodoncia", duration: 60, price: 120 },
  ],
  estetica: [
    { name: "Botox", duration: 30, price: 200 },
    { name: "Ácido hialurónico", duration: 45, price: 250 },
    { name: "Limpieza facial", duration: 60, price: 60 },
    { name: "Peeling químico", duration: 45, price: 100 },
    { name: "Microdermoabrasión", duration: 40, price: 80 },
  ],
  spa: [
    { name: "Masaje relajante", duration: 60, price: 50 },
    { name: "Masaje descontracturante", duration: 60, price: 60 },
    { name: "Facial hidratante", duration: 45, price: 45 },
    { name: "Circuito de aguas", duration: 90, price: 35 },
    { name: "Aromaterapia", duration: 60, price: 55 },
  ],
  salon: [
    { name: "Corte de cabello", duration: 30, price: 25 },
    { name: "Tinte", duration: 90, price: 60 },
    { name: "Mechas/balayage", duration: 120, price: 100 },
    { name: "Manicure", duration: 30, price: 15 },
    { name: "Pedicure", duration: 45, price: 20 },
    { name: "Tratamiento capilar", duration: 45, price: 40 },
  ],
  barberia: [
    { name: "Corte de cabello", duration: 30, price: 15 },
    { name: "Afeitado clásico", duration: 20, price: 12 },
    { name: "Barba + corte", duration: 45, price: 25 },
    { name: "Diseño de barba", duration: 20, price: 10 },
    { name: "Tratamiento capilar", duration: 30, price: 20 },
  ],
  medico: [
    { name: "Consulta general", duration: 30, price: 40 },
    { name: "Consulta especializada", duration: 45, price: 60 },
    { name: "Control de seguimiento", duration: 20, price: 30 },
    { name: "Exámenes de rutina", duration: 30, price: 50 },
    { name: "Certificado médico", duration: 15, price: 20 },
  ],
  psicologia: [
    { name: "Sesión individual", duration: 50, price: 60 },
    { name: "Terapia de pareja", duration: 60, price: 80 },
    { name: "Evaluación psicológica", duration: 90, price: 100 },
    { name: "Sesión familiar", duration: 60, price: 90 },
    { name: "Primera consulta", duration: 60, price: 50 },
  ],
  veterinaria: [
    { name: "Consulta general", duration: 30, price: 30 },
    { name: "Vacunación", duration: 15, price: 25 },
    { name: "Desparasitación", duration: 15, price: 15 },
    { name: "Cirugía menor", duration: 60, price: 100 },
    { name: "Baño y peluquería", duration: 60, price: 25 },
  ],
  otro: [
    { name: "Servicio principal", duration: 30, price: 50 },
    { name: "Consulta inicial", duration: 30, price: 40 },
    { name: "Servicio premium", duration: 60, price: 80 },
  ],
};

const BUSINESS_TYPES = [
  { value: "dental", icon: SmilePlus, label: "Clínica dental", emoji: "🦷" },
  { value: "estetica", icon: Sparkles, label: "Clínica estética", emoji: "✨" },
  { value: "spa", icon: Heart, label: "Spa", emoji: "🧖" },
  { value: "salon", icon: Scissors, label: "Salón de belleza", emoji: "💇" },
  { value: "barberia", icon: Scissors, label: "Barbería", emoji: "💈" },
  { value: "medico", icon: Stethoscope, label: "Consultorio médico", emoji: "🏥" },
  { value: "psicologia", icon: Brain, label: "Psicología", emoji: "🧠" },
  { value: "veterinaria", icon: Dog, label: "Veterinaria", emoji: "🐾" },
  { value: "otro", icon: Package, label: "Otro", emoji: "📦" },
];

const TONES = [
  { value: "professional", icon: "👔", label: "Profesional", desc: "Formal y ejecutivo" },
  { value: "friendly", icon: "😊", label: "Amigable", desc: "Cercano pero profesional" },
  { value: "casual", icon: "🤗", label: "Cercano", desc: "Como hablar con un amigo" },
];

const greetingForTone = (tone: string, agentName: string, businessName: string) => {
  switch (tone) {
    case "professional": return `Buenos días. Soy ${agentName}, asistente virtual de ${businessName}. ¿En qué puedo asistirle?`;
    case "casual": return `¡Hey! 🙌 Soy ${agentName} de ${businessName}. ¿Qué necesitas? Estoy aquí para ti.`;
    default: return `¡Hola! 👋 Soy ${agentName}, la asistente virtual de ${businessName}. ¿En qué puedo ayudarte hoy?`;
  }
};

/* ─── Component ─── */
const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clinicId, refreshClinic } = useClinic();

  // Steps: -1=welcome, 0-3=steps, 4=completion
  const [step, setStep] = useState(-1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Step 2 state
  const [services, setServices] = useState<Service[]>([]);

  // Step 3 state
  const [teamMode, setTeamMode] = useState<"solo" | "team" | "">("");
  const [professionals, setProfessionals] = useState<Professional[]>([{ full_name: "", email: "", specialty: "" }]);

  // Step 4 state
  const [agentName, setAgentName] = useState("Sofía");
  const [tone, setTone] = useState("friendly");
  const [autopilotActive, setAutopilotActive] = useState(true);

  // Summary for completion
  const [summary, setSummary] = useState({ business: "", services: 0, professionals: 0, agent: "" });

  /* ── Step 1: Save business ── */
  const saveStep1 = async () => {
    if (!businessName.trim()) { toast.error("Ingresa el nombre de tu negocio"); return false; }
    if (!businessType) { toast.error("Selecciona el tipo de negocio"); return false; }
    if (!clinicId) { toast.error("Error: no se encontró tu negocio"); return false; }

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

    const { error } = await supabase.from("clinics").update({
      name: businessName.trim(),
      business_type: businessType,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    }).eq("id", clinicId);

    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  /* ── Step 2: Save services ── */
  const saveStep2 = async () => {
    const valid = services.filter(s => s.name.trim());
    if (valid.length === 0) { toast.error("Agrega al menos un servicio"); return false; }

    setSaving(true);
    const rows = valid.map(s => ({ clinic_id: clinicId!, name: s.name.trim(), duration: s.duration || 30, price: s.price || 0 }));
    const { error } = await supabase.from("treatments").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  /* ── Step 3: Save professionals ── */
  const saveStep3 = async () => {
    setSaving(true);
    let prosToInsert: { clinic_id: string; full_name: string; email: string }[] = [];

    if (teamMode === "solo") {
      const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Yo";
      prosToInsert = [{ clinic_id: clinicId!, full_name: fullName, email: user?.email || "" }];
    } else {
      const valid = professionals.filter(p => p.full_name.trim() && p.email.trim());
      if (valid.length === 0) { toast.error("Agrega al menos un profesional"); setSaving(false); return false; }
      prosToInsert = valid.map(p => ({ clinic_id: clinicId!, full_name: p.full_name.trim(), email: p.email.trim() }));
    }

    const { error } = await supabase.from("professionals").insert(prosToInsert);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  /* ── Step 4: Save AI config + finalize ── */
  const saveStep4 = async () => {
    if (!agentName.trim()) { toast.error("Dale un nombre a tu asistente"); return false; }

    setSaving(true);
    const greeting = greetingForTone(tone, agentName, businessName);

    const { error } = await supabase.from("ai_agent_config").upsert({
      clinic_id: clinicId!,
      agent_name: agentName.trim(),
      tone: tone,
      greeting: greeting,
      enabled: autopilotActive,
      objective: "Atender clientes y agendar citas",
      language: "es",
    }, { onConflict: "clinic_id" });

    if (error) { toast.error(error.message); setSaving(false); return false; }

    setSummary({
      business: businessName,
      services: services.filter(s => s.name.trim()).length,
      professionals: teamMode === "solo" ? 1 : professionals.filter(p => p.full_name.trim()).length,
      agent: agentName,
    });

    setSaving(false);
    return true;
  };

  const handleNext = async () => {
    let success = true;
    if (step === 0) success = await saveStep1();
    else if (step === 1) success = await saveStep2();
    else if (step === 2) success = await saveStep3();
    else if (step === 3) {
      success = await saveStep4();
      if (success) { setStep(4); return; }
    }
    if (success) setStep(s => s + 1);
  };

  const generateServices = () => {
    const templates = SERVICE_TEMPLATES[businessType] || SERVICE_TEMPLATES.otro;
    setServices([...templates]);
    toast.success("¡Servicios generados!");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFinish = () => {
    refreshClinic();
    navigate("/dashboard");
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-[#060611] text-white flex flex-col">
      {/* Progress bar */}
      {step >= 0 && step <= 3 && (
        <div className="sticky top-0 z-50 bg-[#060611]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30">Paso {step + 1} de 4</span>
              <span className="text-xs text-white/30">{Math.round(((step + 1) / 4) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {["Negocio", "Servicios", "Equipo", "IA"].map((label, i) => (
                <span key={i} className={`text-[10px] ${i <= step ? "text-[#A78BFA]" : "text-white/15"}`}>
                  {i < step ? "✅ " : ""}{label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* ════ WELCOME ════ */}
          {step === -1 && (
            <div className="text-center">
              <div className="relative mb-8">
                {/* Subtle star particles */}
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white/20 animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 3}s`,
                    }}
                  />
                ))}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(139,92,246,0.3)]">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                Bienvenido a la{" "}
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                  Economía Cuántica
                </span>{" "}
                🚀
              </h1>
              <p className="text-lg text-white/40 max-w-lg mx-auto mb-10">
                En 3 minutos vamos a configurar tus autopilotos. Después de esto, la IA empezará a trabajar para ti.
              </p>
              <button
                onClick={() => setStep(0)}
                className="group rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-8 py-4 text-lg font-bold shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-[1.02] transition-all"
              >
                Activar autopilotos <ArrowRight className="inline ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* ════ STEP 1: BUSINESS ════ */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Cuéntanos sobre tu negocio</h2>
                <p className="text-white/40 mt-1">Esto nos ayuda a personalizar tus autopilotos</p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Nombre del negocio *</label>
                <Input
                  value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="Ej: Clínica Sonrisa" maxLength={100}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#8B5CF6]/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-3">Tipo de negocio *</label>
                <div className="grid grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map(bt => (
                    <button
                      key={bt.value}
                      onClick={() => setBusinessType(bt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border backdrop-blur-sm transition-all ${
                        businessType === bt.value
                          ? "border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <span className="text-2xl">{bt.emoji}</span>
                      <span className="text-xs text-center">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Logo (opcional)</label>
                <div className="relative">
                  <label className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-white/10 bg-white/5 cursor-pointer hover:border-white/20 transition-all">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <Upload className="w-8 h-8 text-white/20" />
                    )}
                    <span className="text-xs text-white/30">{logoPreview ? "Cambiar logo" : "Arrastra o haz click para subir"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 2: SERVICES ════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">¿Qué servicios ofreces?</h2>
                <p className="text-white/40 mt-1">La IA necesita saberlo para responder mensajes y crear contenido</p>
              </div>

              <button
                onClick={generateServices}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#A78BFA] font-medium hover:bg-[#8B5CF6]/15 transition-all"
              >
                <Sparkles className="w-4 h-4" /> Generar servicios con IA
              </button>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {services.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={s.name} placeholder="Nombre del servicio"
                        onChange={e => { const ns = [...services]; ns[i].name = e.target.value; setServices(ns); }}
                        className="h-9 bg-transparent border-white/10 text-white text-sm placeholder:text-white/20"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-white/30">Duración (min)</label>
                          <Input
                            type="number" value={s.duration} min={5}
                            onChange={e => { const ns = [...services]; ns[i].duration = +e.target.value; setServices(ns); }}
                            className="h-8 bg-transparent border-white/10 text-white text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-white/30">Precio ($)</label>
                          <Input
                            type="number" value={s.price} min={0}
                            onChange={e => { const ns = [...services]; ns[i].price = +e.target.value; setServices(ns); }}
                            className="h-8 bg-transparent border-white/10 text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setServices(services.filter((_, j) => j !== i))} className="p-1.5 text-white/20 hover:text-red-400 transition-colors mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setServices([...services, { name: "", duration: 30, price: 0 }])}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar servicio manualmente
              </button>
            </div>
          )}

          {/* ════ STEP 3: TEAM ════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">¿Quién atiende en tu negocio?</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTeamMode("solo")}
                  className={`p-6 rounded-xl border text-center transition-all ${
                    teamMode === "solo" ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="text-3xl">🙋</span>
                  <p className="mt-2 font-medium">Solo soy yo</p>
                  <p className="text-xs text-white/30 mt-1">Se usarán tus datos</p>
                </button>
                <button
                  onClick={() => setTeamMode("team")}
                  className={`p-6 rounded-xl border text-center transition-all ${
                    teamMode === "team" ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="text-3xl">👥</span>
                  <p className="mt-2 font-medium">Tengo un equipo</p>
                  <p className="text-xs text-white/30 mt-1">Agrega profesionales</p>
                </button>
              </div>

              {teamMode === "team" && (
                <div className="space-y-3">
                  {professionals.map((p, i) => (
                    <div key={i} className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={p.full_name} placeholder="Nombre completo *"
                          onChange={e => { const np = [...professionals]; np[i].full_name = e.target.value; setProfessionals(np); }}
                          className="h-9 bg-transparent border-white/10 text-white text-sm placeholder:text-white/20"
                        />
                        <Input
                          value={p.email} placeholder="Email *" type="email"
                          onChange={e => { const np = [...professionals]; np[i].email = e.target.value; setProfessionals(np); }}
                          className="h-9 bg-transparent border-white/10 text-white text-sm placeholder:text-white/20"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={p.specialty} placeholder="Especialidad (opcional)"
                          onChange={e => { const np = [...professionals]; np[i].specialty = e.target.value; setProfessionals(np); }}
                          className="h-9 bg-transparent border-white/10 text-white text-sm placeholder:text-white/20 flex-1"
                        />
                        {professionals.length > 1 && (
                          <button onClick={() => setProfessionals(professionals.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setProfessionals([...professionals, { full_name: "", email: "", specialty: "" }])}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar otro profesional
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 4: AI AGENT ════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Activa tu primer autopiloto</h2>
                <p className="text-white/40 mt-1">Configura la personalidad de tu asistente de IA</p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Nombre del agente</label>
                <Input
                  value={agentName} onChange={e => setAgentName(e.target.value)}
                  placeholder="Ej: Sofía"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#8B5CF6]/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-3">Tono de voz</label>
                <div className="grid grid-cols-3 gap-3">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        tone === t.value
                          ? "border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <p className="mt-2 text-sm font-medium">{t.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/30 mb-2">Tu IA se presentará así:</p>
                <div className="rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 p-3">
                  <p className="text-sm text-[#A78BFA]">{greetingForTone(tone, agentName || "Sofía", businessName || "tu negocio")}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                <div>
                  <p className="text-sm font-medium">Activar Autopilot de Mensajes</p>
                  <p className="text-xs text-white/30 mt-0.5">La IA responderá automáticamente</p>
                </div>
                <Switch checked={autopilotActive} onCheckedChange={setAutopilotActive} />
              </div>
            </div>
          )}

          {/* ════ COMPLETION ════ */}
          {step === 4 && (
            <div className="text-center">
              {/* Simple confetti effect */}
              <div className="relative h-24 mb-4">
                {["🎉", "🚀", "✨", "🎊", "⭐"].map((emoji, i) => (
                  <span
                    key={i}
                    className="absolute text-2xl animate-bounce"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${Math.random() * 60}%`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: `${1 + Math.random()}s`,
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>

              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>

              <h2 className="text-3xl font-extrabold mb-2">¡Autopilotos activados!</h2>
              <p className="text-white/40 mb-8">Tu IA ya está configurada para trabajar por ti.</p>

              <div className="max-w-sm mx-auto space-y-3 text-left mb-10">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-sm">Negocio: <strong>{summary.business}</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-sm">Servicios: <strong>{summary.services} configurados</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-sm">Equipo: <strong>{summary.professionals} profesional(es)</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-sm">Asistente IA: <strong>{summary.agent}</strong> activada</span>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="group rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-8 py-4 text-lg font-bold shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-[1.02] transition-all"
              >
                Ir a mi Command Center <ArrowRight className="inline ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* ════ NAVIGATION BUTTONS ════ */}
          {step >= 0 && step <= 3 && (
            <div className="flex justify-between mt-10">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={handleNext}
                disabled={saving || (step === 2 && !teamMode)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : step === 3 ? "Finalizar" : "Siguiente"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
