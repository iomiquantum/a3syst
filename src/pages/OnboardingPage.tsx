import { useState, useRef, useEffect, useReducer, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Send, Copy, ExternalLink, MessageCircle, ArrowRight,
  Upload, Sparkles, Loader2, Check, FileText, Pencil, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface ServiceData {
  name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
}

interface CollectedData {
  business_name: string | null;
  business_type: string | null;
  description: string | null;
  city: string | null;
  whatsapp: string | null;
  opening_hour: string | null;
  closing_hour: string | null;
  working_days: string[] | null;
  services: ServiceData[];
  additional_info: string;
  agent_name: string | null;
  agent_tone: string | null;
}

interface ConvMessage {
  role: "assistant" | "user";
  content: string;
}

interface SummaryCard {
  show: boolean;
  title: string;
  items: { label: string; value: string }[];
}

interface BrandingState {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

type Phase = "choosing" | "conversation" | "external_prompt" | "external_paste" | "review" | "branding" | "generating" | "done";

interface OnboardingState {
  method: "voice" | "external" | null;
  collectedData: CollectedData;
  branding: BrandingState;
  conversationHistory: ConvMessage[];
  suggestedQuestions: string[];
  summaryCards: SummaryCard[];
  progress: number;
  isComplete: boolean;
  canFinish: boolean;
  currentPhase: Phase;
  isProcessing: boolean;
  slug: string;
}

type Action =
  | { type: "SET_METHOD"; method: "voice" | "external" }
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "ADD_USER_MSG"; content: string }
  | { type: "SET_PROCESSING"; v: boolean }
  | { type: "AI_RESPONSE"; data: any }
  | { type: "UPDATE_DATA"; data: Partial<CollectedData> }
  | { type: "SET_BRANDING"; branding: Partial<BrandingState> }
  | { type: "SET_SLUG"; slug: string }
  | { type: "LOAD_STATE"; state: Partial<OnboardingState> };

const emptyData: CollectedData = {
  business_name: null, business_type: null, description: null, city: null,
  whatsapp: null, opening_hour: null, closing_hour: null, working_days: null,
  services: [], additional_info: "", agent_name: null, agent_tone: null,
};

const initialState: OnboardingState = {
  method: null,
  collectedData: { ...emptyData },
  branding: { primary_color: "#6366f1", secondary_color: "#f0f0ff", logo_url: null },
  conversationHistory: [],
  suggestedQuestions: [],
  summaryCards: [],
  progress: 0,
  isComplete: false,
  canFinish: false,
  currentPhase: "choosing",
  isProcessing: false,
  slug: "",
};

function mergeData(existing: CollectedData, incoming: any): CollectedData {
  if (!incoming) return existing;
  return {
    business_name: incoming.business_name || existing.business_name,
    business_type: incoming.business_type || existing.business_type,
    description: incoming.description || existing.description,
    city: incoming.city || existing.city,
    whatsapp: incoming.whatsapp || existing.whatsapp,
    opening_hour: incoming.opening_hour || existing.opening_hour,
    closing_hour: incoming.closing_hour || existing.closing_hour,
    working_days: incoming.working_days || existing.working_days,
    services: (incoming.services?.length > 0 ? incoming.services : existing.services) || [],
    additional_info: incoming.additional_info || existing.additional_info || "",
    agent_name: incoming.agent_name || existing.agent_name,
    agent_tone: incoming.agent_tone || existing.agent_tone,
  };
}

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case "SET_METHOD":
      return { ...state, method: action.method };
    case "SET_PHASE":
      return { ...state, currentPhase: action.phase };
    case "ADD_USER_MSG":
      return { ...state, conversationHistory: [...state.conversationHistory, { role: "user", content: action.content }] };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.v };
    case "AI_RESPONSE":
      return {
        ...state,
        isProcessing: false,
        collectedData: mergeData(state.collectedData, action.data.extracted_data),
        conversationHistory: [...state.conversationHistory, { role: "assistant", content: action.data.message }],
        suggestedQuestions: action.data.suggested_questions || [],
        summaryCards: action.data.summary_card?.show
          ? [...state.summaryCards, action.data.summary_card]
          : state.summaryCards,
        progress: action.data.progress_percentage || state.progress,
        isComplete: action.data.is_complete || false,
        canFinish: action.data.can_finish || false,
      };
    case "UPDATE_DATA":
      return { ...state, collectedData: { ...state.collectedData, ...action.data } };
    case "SET_BRANDING":
      return { ...state, branding: { ...state.branding, ...action.branding } };
    case "SET_SLUG":
      return { ...state, slug: action.slug };
    case "LOAD_STATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

/* ─── Color presets ─── */
const COLOR_PRESETS = [
  { color: "#2563eb", label: "Azul médico" },
  { color: "#e11d48", label: "Rosa spa" },
  { color: "#059669", label: "Verde bienestar" },
  { color: "#ea580c", label: "Naranja energía" },
  { color: "#7c3aed", label: "Morado premium" },
  { color: "#0891b2", label: "Teal" },
  { color: "#ca8a04", label: "Dorado" },
  { color: "#4f46e5", label: "Índigo" },
];

const AUTO_PALETTES: Record<string, { primary: string; secondary: string }> = {
  clinica: { primary: "#2563eb", secondary: "#eff6ff" },
  spa: { primary: "#e11d48", secondary: "#fff1f2" },
  dental: { primary: "#2563eb", secondary: "#eff6ff" },
  estudio: { primary: "#059669", secondary: "#ecfdf5" },
  tienda: { primary: "#ea580c", secondary: "#fff7ed" },
  default: { primary: "#7c3aed", secondary: "#f5f3ff" },
};

const EXTERNAL_PROMPT = `Eres un asistente que me ayudará a configurar mi negocio en A3SYST.
Hazme preguntas UNA POR UNA sobre mi negocio. Adapta tus preguntas según mis respuestas.

Necesitas recopilar:
- Nombre y tipo de negocio
- Descripción breve
- Ubicación/ciudad
- WhatsApp de contacto
- Horarios y días de atención
- Mínimo 2 servicios/productos con nombre, precio, duración y descripción
- Cualquier info adicional relevante (métodos de pago, políticas, etc.)

Cuando yo diga que ya terminé, genera este JSON EXACTO:

---A3SYST-DATA-START---
{
  "business_name": "",
  "business_type": "",
  "description": "",
  "city": "",
  "whatsapp": "",
  "opening_hour": "",
  "closing_hour": "",
  "working_days": [],
  "services": [{"name":"","price":0,"duration":"","description":""}],
  "additional_info": "",
  "agent_name": "",
  "agent_tone": ""
}
---A3SYST-DATA-END---

Sugiere nombre y tono para un asistente virtual del negocio.
Empieza con tu primera pregunta.`;

/* ─── Component ─── */
const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clinicId, refreshClinic } = useClinic();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [generationStep, setGenerationStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { currentPhase, collectedData, conversationHistory, suggestedQuestions, progress, isProcessing, branding } = state;

  // Persist state
  useEffect(() => {
    if (currentPhase !== "choosing") {
      localStorage.setItem("a3_onboarding", JSON.stringify({
        method: state.method,
        collectedData: state.collectedData,
        conversationHistory: state.conversationHistory,
        progress: state.progress,
        currentPhase: state.currentPhase,
        branding: state.branding,
      }));
    }
  }, [state.collectedData, state.conversationHistory, state.progress, currentPhase, state.method, state.branding]);

  // Restore state
  useEffect(() => {
    const saved = localStorage.getItem("a3_onboarding");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentPhase && parsed.currentPhase !== "choosing") {
          dispatch({ type: "LOAD_STATE", state: parsed });
        }
      } catch {}
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, isProcessing]);

  // Check speech support
  const speechSupported = typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  /* ─── AI call ─── */
  const callAI = useCallback(async (userMessage: string, externalText?: string) => {
    dispatch({ type: "SET_PROCESSING", v: true });

    const missingFields: string[] = [];
    if (!collectedData.business_name) missingFields.push("business_name");
    if (!collectedData.business_type) missingFields.push("business_type");
    if (!collectedData.city) missingFields.push("city");
    if (!collectedData.whatsapp) missingFields.push("whatsapp");
    if (!collectedData.opening_hour) missingFields.push("horario");
    if ((collectedData.services?.length || 0) < 2) missingFields.push("services (necesita mínimo 2)");

    try {
      const { data, error } = await supabase.functions.invoke("onboarding-conversation", {
        body: {
          user_message: userMessage,
          collected_data: collectedData,
          conversation_history: conversationHistory,
          missing_fields: missingFields,
          progress_percentage: progress,
          ...(externalText ? { external_text: externalText } : {}),
        },
      });
      if (error) throw error;
      dispatch({ type: "AI_RESPONSE", data });

      if (data.is_complete) {
        dispatch({ type: "SET_PHASE", phase: "review" });
      }
    } catch (e: any) {
      dispatch({ type: "SET_PROCESSING", v: false });
      toast.error("Error al comunicarse con la IA. Intenta de nuevo.");
      console.error(e);
    }
  }, [collectedData, conversationHistory, progress]);

  /* ─── Send message ─── */
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    dispatch({ type: "ADD_USER_MSG", content: trimmed });
    setTextInput("");
    setInterimText("");

    if (trimmed === "✅ Ya di toda mi información") {
      dispatch({ type: "SET_PHASE", phase: "review" });
      return;
    }

    callAI(trimmed);
  }, [callAI]);

  /* ─── Voice ─── */
  const startRecording = () => {
    if (!speechSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimText(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        sendMessage(finalTranscript.trim());
      }
      setInterimText("");
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  /* ─── Start conversation ─── */
  const startVoiceOnboarding = () => {
    dispatch({ type: "SET_METHOD", method: "voice" });
    dispatch({ type: "SET_PHASE", phase: "conversation" });
    if (!speechSupported) setShowTextInput(true);
    callAI("INICIO_ONBOARDING");
  };

  const startExternalOnboarding = () => {
    dispatch({ type: "SET_METHOD", method: "external" });
    dispatch({ type: "SET_PHASE", phase: "external_prompt" });
  };

  /* ─── External paste ─── */
  const processExternalPaste = async () => {
    if (!pastedText.trim()) { toast.error("Pega el resultado aquí"); return; }

    // Try to extract JSON between markers
    const markerMatch = pastedText.match(/---A3SYST-DATA-START---([\s\S]*?)---A3SYST-DATA-END---/);
    if (markerMatch) {
      try {
        const parsed = JSON.parse(markerMatch[1].trim());
        dispatch({ type: "UPDATE_DATA", data: parsed });
        dispatch({ type: "SET_PHASE", phase: "review" });
        return;
      } catch {}
    }

    // Fallback: send to AI to parse
    dispatch({ type: "SET_PROCESSING", v: true });
    dispatch({ type: "SET_PHASE", phase: "conversation" });
    dispatch({ type: "ADD_USER_MSG", content: "[Texto pegado desde IA externa]" });
    await callAI("PARSE_EXTERNAL", pastedText);
  };

  /* ─── Branding ─── */
  const autoSelectColors = () => {
    const type = collectedData.business_type?.toLowerCase() || "";
    const matched = Object.keys(AUTO_PALETTES).find(k => type.includes(k));
    const palette = AUTO_PALETTES[matched || "default"];
    dispatch({ type: "SET_BRANDING", branding: { primary_color: palette.primary, secondary_color: palette.secondary } });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  /* ─── Generation ─── */
  const generateBusiness = async () => {
    if (!clinicId) return;
    dispatch({ type: "SET_PHASE", phase: "generating" });

    const steps = [
      "Creando tu perfil de negocio...",
      "Registrando tus servicios...",
      "Configurando tu asistente IA...",
      "Diseñando tu landing page...",
      "Activando tu chatbot...",
    ];

    // Step 1: Upload logo
    let logoUrl: string | null = branding.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${clinicId}/logo.${ext}`;
      const { error } = await supabase.storage.from("clinic-logos").upload(path, logoFile, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("clinic-logos").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }
    }

    setGenerationStep(0);
    // Step 1: Update clinic
    const { data: slugData } = await supabase.rpc("generate_clinic_slug", {
      clinic_name: collectedData.business_name || "mi-negocio",
    });
    const slug = slugData || collectedData.business_name?.toLowerCase().replace(/\s+/g, "-") || "mi-negocio";

    await supabase.from("clinics").update({
      name: collectedData.business_name || "Mi Negocio",
      business_type: collectedData.business_type || "general",
      description: collectedData.description || "",
      city: collectedData.city || "",
      whatsapp: collectedData.whatsapp || "",
      opening_hour: collectedData.opening_hour || "09:00",
      closing_hour: collectedData.closing_hour || "18:00",
      working_days: collectedData.working_days || ["Lun", "Mar", "Mié", "Jue", "Vie"],
      slug,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      additional_info: collectedData.additional_info || "",
      onboarding_method: state.method,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    } as any).eq("id", clinicId);

    setGenerationStep(1);
    await new Promise(r => setTimeout(r, 600));

    // Step 2: Insert treatments
    if (collectedData.services.length > 0) {
      const rows = collectedData.services.filter(s => s.name).map(s => ({
        clinic_id: clinicId,
        name: s.name,
        price: s.price || 0,
        duration: parseInt(s.duration || "30") || 30,
        description: s.description || "",
      }));
      if (rows.length > 0) {
        await supabase.from("treatments").insert(rows);
      }
    }

    setGenerationStep(2);
    await new Promise(r => setTimeout(r, 600));

    // Step 3: AI agent config
    await supabase.from("ai_agent_config").upsert({
      clinic_id: clinicId,
      agent_name: collectedData.agent_name || "Ana",
      tone: collectedData.agent_tone || "friendly",
      greeting: `¡Hola! 👋 Soy ${collectedData.agent_name || "Ana"}, asistente de ${collectedData.business_name || "tu negocio"}. ¿En qué puedo ayudarte?`,
      enabled: true,
      objective: "Atender clientes y agendar citas",
      language: "es",
      services: [] as any,
      special_instructions: collectedData.additional_info || "",
    }, { onConflict: "clinic_id" });

    setGenerationStep(3);
    await new Promise(r => setTimeout(r, 600));

    setGenerationStep(4);
    await new Promise(r => setTimeout(r, 600));

    // Mark completed
    await supabase.from("clinics").update({ onboarding_completed: true } as any).eq("id", clinicId);

    dispatch({ type: "SET_SLUG", slug });
    dispatch({ type: "SET_PHASE", phase: "done" });
    localStorage.removeItem("a3_onboarding");
  };

  const handleFinish = () => {
    refreshClinic();
    navigate("/dashboard");
  };

  const landingUrl = `${window.location.origin}/negocio/${state.slug}`;
  const copyLink = () => { navigator.clipboard.writeText(landingUrl); toast.success("¡Link copiado!"); };
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mira mi negocio! ${landingUrl}`)}`, "_blank");
  const copyPrompt = () => { navigator.clipboard.writeText(EXTERNAL_PROMPT); toast.success("¡Prompt copiado!"); };

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress bar (conversation & review phases) */}
      {["conversation", "review", "branding"].includes(currentPhase) && (
        <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Configurando tu negocio</span>
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: CHOOSING ═══ */}
      {currentPhase === "choosing" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">🚀 Vamos a crear tu negocio digital</h1>
              <p className="text-muted-foreground">Elige cómo prefieres contarnos sobre tu negocio</p>
            </div>

            <div className="grid gap-4">
              {/* Voice option */}
              <button onClick={startVoiceOnboarding}
                className="p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all text-left group relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ⭐ Recomendado
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Mic className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">🎤 Cuéntamelo conversando</h3>
                <p className="text-sm text-muted-foreground">Responde preguntas hablando o escribiendo. La IA escucha, entiende y crea todo por ti.</p>
                <p className="text-xs text-muted-foreground mt-2">~10 minutos</p>
              </button>

              {/* External option */}
              <button onClick={startExternalOnboarding}
                className="p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all text-left group">
                <div className="absolute top-3 right-3 bg-accent/10 text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ⚡ Rápido
                </div>
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:bg-muted/80 transition-colors">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">📋 Trae tu info lista</h3>
                <p className="text-sm text-muted-foreground">Te damos un prompt. Llévalo a ChatGPT o cualquier IA, responde sus preguntas, y pega aquí el resultado.</p>
                <p className="text-xs text-muted-foreground mt-2">~5 minutos</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: CONVERSATION ═══ */}
      {currentPhase === "conversation" && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversationHistory.map((msg, i) => (
              <div key={i}>
                <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>

                {/* Summary cards after assistant messages */}
                {msg.role === "assistant" && state.summaryCards[Math.floor(i / 2)] && (
                  <div className="flex justify-center my-3">
                    <div className="bg-card border border-primary/20 rounded-xl p-3 max-w-sm w-full shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">{state.summaryCards[Math.floor(i / 2)].title}</span>
                      </div>
                      {state.summaryCards[Math.floor(i / 2)].items.map((item, j) => (
                        <div key={j} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entendiendo tu respuesta...
                  </div>
                </div>
              </div>
            )}

            {/* Interim text */}
            {isRecording && interimText && (
              <div className="flex justify-end">
                <div className="bg-primary/20 text-foreground px-4 py-3 rounded-2xl rounded-br-sm max-w-[80%] text-sm italic">
                  {interimText}
                </div>
              </div>
            )}

            {/* Suggestion chips */}
            {!isProcessing && suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm border transition-all",
                      q.startsWith("✅")
                        ? "border-primary bg-primary/10 text-primary font-medium hover:bg-primary/20"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted"
                    )}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-card p-4 shrink-0">
            {showTextInput || !speechSupported ? (
              <div className="flex items-end gap-2">
                <Textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(textInput); } }}
                  placeholder="Escribe tu respuesta..."
                  rows={1}
                  className="resize-none flex-1"
                  disabled={isProcessing}
                />
                <Button onClick={() => sendMessage(textInput)} disabled={!textInput.trim() || isProcessing} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* Mic button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                    isRecording
                      ? "bg-destructive text-white animate-pulse scale-110"
                      : "bg-primary text-primary-foreground hover:scale-105"
                  )}>
                  {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>
                <span className="text-xs text-muted-foreground">
                  {isRecording ? "Escuchando... toca para parar" : "Toca para hablar"}
                </span>
                <button onClick={() => setShowTextInput(true)} className="text-xs text-primary hover:underline">
                  Prefiero escribir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PHASE: EXTERNAL PROMPT ═══ */}
      {currentPhase === "external_prompt" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">📋 Copia este prompt y llévalo a tu IA favorita</h2>
              <p className="text-sm text-muted-foreground">Pégalo en ChatGPT, Gemini, Claude o cualquier IA. Responde todas las preguntas. Cuando termine, copia el resultado y pégalo aquí.</p>
            </div>

            <div className="relative bg-card border border-border rounded-xl p-4">
              <pre className="text-xs text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">{EXTERNAL_PROMPT}</pre>
              <Button onClick={copyPrompt} className="mt-3 w-full" size="lg">
                <Copy className="w-4 h-4 mr-2" /> Copiar prompt
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => window.open("https://chat.openai.com", "_blank")}>Abrir ChatGPT</Button>
              <Button variant="outline" size="sm" onClick={() => window.open("https://gemini.google.com", "_blank")}>Abrir Gemini</Button>
              <Button variant="outline" size="sm" onClick={() => window.open("https://claude.ai", "_blank")}>Abrir Claude</Button>
            </div>

            <Button onClick={() => dispatch({ type: "SET_PHASE", phase: "external_paste" })} className="w-full" variant="secondary" size="lg">
              ✅ Ya tengo mi resultado → Pegar aquí
            </Button>
          </div>
        </div>
      )}

      {/* ═══ PHASE: EXTERNAL PASTE ═══ */}
      {currentPhase === "external_paste" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Pega el resultado aquí</h2>
              <p className="text-sm text-muted-foreground">Copia toda la conversación o solo el JSON final y pégalo aquí</p>
            </div>

            <Textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Pega aquí el resultado de tu conversación con la IA..."
              rows={12}
              className="resize-none"
            />

            <Button onClick={processExternalPaste} disabled={!pastedText.trim() || isProcessing} className="w-full" size="lg">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : "Procesar información"}
            </Button>

            <Button variant="ghost" onClick={() => dispatch({ type: "SET_PHASE", phase: "external_prompt" })}>
              ← Volver al prompt
            </Button>
          </div>
        </div>
      )}

      {/* ═══ PHASE: REVIEW ═══ */}
      {currentPhase === "review" && (
        <div className="flex-1 flex items-start justify-center p-4 pt-8">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">📋 Revisa tu información</h2>
              <p className="text-sm text-muted-foreground">Verifica que todo esté correcto antes de continuar</p>
            </div>

            {/* Business info card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">🏢 Tu negocio</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span className="font-medium">{collectedData.business_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{collectedData.business_type || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ciudad</span><span className="font-medium">{collectedData.city || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WhatsApp</span><span className="font-medium">{collectedData.whatsapp || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Horario</span><span className="font-medium">{collectedData.opening_hour || "09:00"} - {collectedData.closing_hour || "18:00"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Días</span><span className="font-medium">{collectedData.working_days?.join(", ") || "Lun-Vie"}</span></div>
              </div>
              {collectedData.description && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">{collectedData.description}</p>
              )}
            </div>

            {/* Services cards */}
            {collectedData.services.length > 0 && (
              <div className="space-y-2">
                {collectedData.services.map((s, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{s.name}</span>
                      <span className="text-sm font-bold text-primary">{s.price != null ? `$${s.price}` : "—"}</span>
                    </div>
                    {(s.duration || s.description) && (
                      <p className="text-xs text-muted-foreground mt-1">{[s.duration, s.description].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* AI Assistant suggestion */}
            <div className="bg-card border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-2">🤖 Tu asistente IA</h3>
              <div className="flex gap-3 text-sm">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Nombre</label>
                  <Input
                    value={collectedData.agent_name || ""}
                    onChange={e => dispatch({ type: "UPDATE_DATA", data: { agent_name: e.target.value } })}
                    placeholder="Ej: Ana"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Tono</label>
                  <Input
                    value={collectedData.agent_tone || ""}
                    onChange={e => dispatch({ type: "UPDATE_DATA", data: { agent_tone: e.target.value } })}
                    placeholder="Ej: amigable"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: "SET_PHASE", phase: "conversation" })}>
                <Pencil className="w-4 h-4 mr-2" /> Corregir algo
              </Button>
              <Button className="flex-1" onClick={() => dispatch({ type: "SET_PHASE", phase: "branding" })}>
                ✅ Todo correcto <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: BRANDING ═══ */}
      {currentPhase === "branding" && (
        <div className="flex-1 flex items-start justify-center p-4 pt-8">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">🎨 Dale estilo a tu negocio</h2>
              <p className="text-sm text-muted-foreground">Elige colores y logo para tu landing page</p>
            </div>

            {/* Color selection */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Color principal</h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={autoSelectColors}>
                  <Sparkles className="w-3 h-3 mr-1" /> Que la IA elija
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {COLOR_PRESETS.map(p => (
                  <button key={p.color} onClick={() => dispatch({ type: "SET_BRANDING", branding: { primary_color: p.color } })}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      branding.primary_color === p.color ? "border-foreground scale-110 shadow-lg" : "border-transparent hover:scale-105"
                    )} style={{ backgroundColor: p.color }} title={p.label} />
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="h-20 flex items-center justify-center" style={{ backgroundColor: branding.primary_color }}>
                  <span className="text-white font-bold text-lg">{collectedData.business_name || "Tu Negocio"}</span>
                </div>
                <div className="p-3 text-xs text-muted-foreground" style={{ backgroundColor: branding.secondary_color }}>
                  Preview de tu landing page
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm">Logo</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/40 transition-all">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">{logoPreview ? "Cambiar" : "📤 Subir logo"}</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <button onClick={() => { setLogoFile(null); setLogoPreview(""); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 transition-all">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: branding.primary_color }}>
                    {(collectedData.business_name || "N")[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-muted-foreground">⏭️ Usar iniciales</span>
                </button>
              </div>
            </div>

            <Button onClick={generateBusiness} size="lg" className="w-full">
              🚀 Generar mi negocio
            </Button>
          </div>
        </div>
      )}

      {/* ═══ PHASE: GENERATING ═══ */}
      {currentPhase === "generating" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Creando tu negocio...</h2>

            <div className="space-y-3 text-left">
              {["Creando tu perfil de negocio...", "Registrando tus servicios...", "Configurando tu asistente IA...", "Diseñando tu landing page...", "Activando tu chatbot..."].map((label, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-500",
                  i < generationStep ? "text-primary" : i === generationStep ? "text-foreground" : "text-muted-foreground/40"
                )}>
                  {i < generationStep ? (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  ) : i === generationStep ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-muted-foreground/20 shrink-0" />
                  )}
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: DONE ═══ */}
      {currentPhase === "done" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-3xl font-bold">¡Tu negocio está en línea!</h2>
            <p className="text-muted-foreground">Comparte tu link para empezar a recibir clientes</p>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
              <input readOnly value={landingUrl} className="flex-1 text-sm bg-transparent border-none outline-none text-foreground truncate" />
              <Button size="sm" variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.open(`/negocio/${state.slug}`, "_blank")} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" /> Ver mi landing
              </Button>
              <Button onClick={shareWA} variant="outline" className="text-emerald-600">
                <MessageCircle className="w-4 h-4 mr-2" /> Compartir por WhatsApp
              </Button>
            </div>

            <Button onClick={handleFinish} size="lg" className="mt-4 w-full">
              Ir al panel de control <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
