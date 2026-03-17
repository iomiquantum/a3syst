import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Clock, Phone, MessageCircle, ExternalLink, Send, X, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

/* ─── Types ─── */
interface ClinicData {
  id: string;
  name: string;
  description: string;
  business_type: string;
  city: string;
  whatsapp: string;
  opening_hour: string;
  closing_hour: string;
  working_days: string[];
  logo_url: string | null;
  slug: string;
}

interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  image_url: string | null;
}

interface AgentData {
  agent_name: string;
  tone: string;
  greeting: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
}

const GRADIENT_MAP: Record<string, string> = {
  clinica: "from-blue-500/20 to-cyan-500/20",
  spa: "from-pink-500/20 to-purple-500/20",
  dental: "from-sky-500/20 to-blue-500/20",
  psicologia: "from-violet-500/20 to-indigo-500/20",
  tienda: "from-orange-500/20 to-amber-500/20",
  default: "from-primary/20 to-primary/10",
};

const BusinessLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState<"form" | "chat">("form");
  const [visitorName, setVisitorName] = useState("");
  const [visitorContact, setVisitorContact] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Fetch clinic data
  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ["business-landing", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug!)
        .eq("onboarding_completed", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("not_found");
      return data as unknown as ClinicData;
    },
    enabled: !!slug,
  });

  const { data: services } = useQuery({
    queryKey: ["business-services", clinic?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("treatments")
        .select("*")
        .eq("clinic_id", clinic!.id);
      return (data || []) as unknown as ServiceData[];
    },
    enabled: !!clinic?.id,
  });

  const { data: agentConfig } = useQuery({
    queryKey: ["business-agent", clinic?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agent_config")
        .select("agent_name, tone, greeting")
        .eq("clinic_id", clinic!.id)
        .maybeSingle();
      return data as AgentData | null;
    },
    enabled: !!clinic?.id,
  });

  const gradient = GRADIENT_MAP[clinic?.business_type || ""] || GRADIENT_MAP.default;
  const agentName = agentConfig?.agent_name || "Asistente";

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return "";
    if (days.length === 7) return "Todos los días";
    return days.join(", ");
  };

  const startChat = async (preMessage?: string) => {
    if (chatStep === "form") {
      if (!visitorName.trim()) return;
      setChatStep("chat");
      setChatMessages([{
        id: "welcome",
        role: "bot",
        content: agentConfig?.greeting || `¡Hola! 👋 Soy ${agentName} de ${clinic?.name}. ¿En qué puedo ayudarte?`,
      }]);
      if (preMessage) {
        setTimeout(() => sendChatMessage(preMessage), 500);
      }
      return;
    }
    if (preMessage) sendChatMessage(preMessage);
  };

  const openChatWithMessage = (msg: string) => {
    setChatOpen(true);
    if (chatStep === "chat") {
      sendChatMessage(msg);
    } else {
      // Store pre-message, user needs to fill form first
      setInputMsg(msg);
    }
  };

  const sendChatMessage = async (content?: string) => {
    const msg = content || inputMsg.trim();
    if (!msg || !clinic) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMsg("");
    setSending(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/widget-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinic.id,
          name: visitorName,
          phone: visitorContact,
          message: msg,
          conversation_id: conversationId,
          _ts: Date.now(),
        }),
      });

      const data = await resp.json();
      if (data.conversation_id) setConversationId(data.conversation_id);

      // Wait for AI reply
      if (data.conversation_id) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", data.conversation_id)
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (msgs && msgs.length > 0) {
          setChatMessages(prev => [...prev, {
            id: msgs[0].id,
            role: "bot",
            content: msgs[0].content,
          }]);
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: "error",
        role: "bot",
        content: "Lo siento, hubo un error. Por favor intenta de nuevo.",
      }]);
    }
    setSending(false);
  };

  // 404
  if (error || (!isLoading && !clinic)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">Este negocio no existe</h1>
          <p className="text-muted-foreground mb-6">El link que buscas no está disponible.</p>
          <Link to="/registro">
            <Button>¿Quieres crear el tuyo?</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !clinic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HERO ═══ */}
      <section className={`bg-gradient-to-br ${gradient} py-16 md:py-24 px-4`}>
        <div className="max-w-4xl mx-auto text-center">
          {clinic.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6 shadow-lg" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-3xl font-bold text-primary-foreground">{clinic.name[0]}</span>
            </div>
          )}
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 border border-primary/20">
            {BUSINESS_TYPES_LABELS[clinic.business_type] || clinic.business_type}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{clinic.name}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">{clinic.description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => { setChatOpen(true); }}>
              <MessageCircle className="w-5 h-5 mr-2" /> Habla con nosotros
            </Button>
            {clinic.whatsapp && (
              <Button size="lg" variant="outline" onClick={() => window.open(`https://wa.me/${clinic.whatsapp.replace(/\D/g, "")}`, "_blank")}>
                <Phone className="w-5 h-5 mr-2" /> WhatsApp directo
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      {services && services.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              {["tienda", "farmacia"].includes(clinic.business_type) ? "Nuestros Productos" : "Nuestros Servicios"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(s => (
                <div key={s.id} className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <span className="text-lg font-bold text-primary">${s.price}</span>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between">
                    {s.duration > 0 && <span className="text-xs text-muted-foreground">⏱ {s.duration} min</span>}
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => openChatWithMessage(`Hola, me interesa ${s.name}`)}>
                      Consultar →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ INFO ═══ */}
      <section className="py-12 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {clinic.city && (
            <div className="flex flex-col items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{clinic.city}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">
              {formatDays(clinic.working_days || [])}: {clinic.opening_hour} - {clinic.closing_hour}
            </span>
          </div>
          {clinic.whatsapp && (
            <div className="flex flex-col items-center gap-2">
              <Phone className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{clinic.whatsapp}</span>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <a href="/" className="text-primary hover:underline font-medium">A3SYST</a> — Economía Cuántica para tu negocio
        </p>
        <p className="text-xs text-muted-foreground mt-1">© {new Date().getFullYear()}</p>
      </footer>

      {/* ═══ CHAT WIDGET ═══ */}
      {/* Float button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-96 h-[100dvh] md:h-[500px] md:rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-xs font-bold">{agentName[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{agentName}</p>
                <p className="text-[10px] opacity-70">● En línea</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="opacity-70 hover:opacity-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {chatStep === "form" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Antes de empezar, ¿cómo te llamas?
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tu nombre *</label>
                  <Input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="¿Cómo te llamas?" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono o email *</label>
                  <Input value={visitorContact} onChange={e => setVisitorContact(e.target.value)} placeholder="Para contactarte" />
                </div>
                <Button className="w-full" onClick={() => startChat()} disabled={!visitorName.trim() || !visitorContact.trim()}>
                  Iniciar chat <Send className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-xl rounded-bl-none text-sm text-muted-foreground animate-pulse">
                      Escribiendo...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          {chatStep === "chat" && (
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                  disabled={sending}
                />
                <Button size="icon" onClick={() => sendChatMessage()} disabled={sending || !inputMsg.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {/* Quick actions */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {["Ver servicios", "Agendar cita", "Horarios"].map(q => (
                  <button key={q} onClick={() => sendChatMessage(q)}
                    className="text-[10px] px-2 py-1 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BUSINESS_TYPES_LABELS: Record<string, string> = {
  clinica: "Negocio / Consultorio",
  spa: "Spa / Bienestar",
  estudio: "Estudio",
  dental: "Consultorio Dental",
  psicologia: "Consultorio Psicológico",
  farmacia: "Farmacia",
  tienda: "Tienda / Comercio",
  servicios: "Servicios Profesionales",
  otro: "Negocio",
};

export default BusinessLandingPage;
