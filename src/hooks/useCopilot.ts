import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCopilotContext, CopilotMessage } from "@/contexts/CopilotContext";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "admin" | "manager" | "empleado" | "vendedor";

const ROLE_PERMISSIONS: Record<AppRole, { canRead: string[]; canWrite: string[]; canDelete: string[]; label: string }> = {
  super_admin: { canRead: ["todo"], canWrite: ["todo"], canDelete: ["todo"], label: "Administrador general" },
  admin: { canRead: ["todo en su clínica"], canWrite: ["todo en su clínica"], canDelete: ["todo en su clínica"], label: "Administrador de clínica" },
  manager: { canRead: ["pacientes", "agenda", "ventas", "mensajes", "equipo"], canWrite: ["agenda", "pacientes", "mensajes"], canDelete: [], label: "Gerente" },
  empleado: { canRead: ["sus pacientes", "su agenda", "mensajes asignados"], canWrite: ["sus citas", "notas de pacientes"], canDelete: [], label: "Empleado" },
  vendedor: { canRead: ["contactos", "pipeline", "mensajes", "métricas de ventas"], canWrite: ["contactos", "notas", "etapa del pipeline"], canDelete: [], label: "Vendedor" },
};

const PAGE_SUBTITLES: Record<string, string> = {
  "/dashboard": "Revisando tu día — puedo consultar datos y sugerir acciones",
  "/marketing": "Módulo de marketing — puedo ayudarte con campañas",
  "/agenda": "Tu agenda — puedo consultar horarios y disponibilidad",
  "/mensajes": "Mensajería — puedo revisar conversaciones",
  "/mi-negocio": "Configuración — puedo ayudarte a configurar",
  "/ventas": "Ventas — puedo consultar ingresos y tendencias",
  "/pacientes": "Pacientes — puedo buscar fichas y datos",
  "/contenido": "Contenido — puedo ayudarte a crear posts",
  "/crm": "CRM — puedo consultar contactos y pipeline",
  "/ads": "Ads — puedo ayudarte con campañas publicitarias",
  "/whatsapp": "WhatsApp — puedo consultar conexiones y mensajes",
};

const WELCOME_MESSAGES: Record<string, string> = {
  super_admin: "¡Hola! Soy el Copiloto a3. Puedo:\n• Consultar cualquier dato de tu negocio en tiempo real\n• Configurar y modificar cualquier parte del sistema por ti\n• Analizar tendencias y darte recomendaciones\n• Crear automatizaciones describiendo lo que necesitas\nEscríbeme o envíame una nota de voz.",
  admin: "¡Hola! Soy el Copiloto a3. Puedo:\n• Consultar cualquier dato de tu negocio en tiempo real\n• Configurar y modificar cualquier parte del sistema por ti\n• Analizar tendencias y darte recomendaciones\n• Crear automatizaciones describiendo lo que necesitas\nEscríbeme o envíame una nota de voz.",
  manager: "¡Hola! Soy el Copiloto a3. Puedo ayudarte a:\n• Consultar datos de pacientes, citas y ventas\n• Gestionar la agenda y el equipo\n• Ver métricas y recomendaciones\nEscríbeme o envíame una nota de voz.",
  empleado: "¡Hola! Soy el Copiloto a3. Puedo ayudarte a:\n• Consultar tu agenda y pacientes del día\n• Buscar información de pacientes\n• Responder dudas sobre el sistema\nEscríbeme o envíame una nota de voz.",
  vendedor: "¡Hola! Soy el Copiloto a3. Puedo ayudarte a:\n• Consultar el pipeline y contactos\n• Ver métricas de tus conversaciones\n• Buscar información de leads\nEscríbeme o envíame una nota de voz.",
};

const QUICK_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  super_admin: {
    "/dashboard": ["¿Cómo van mis citas?", "Pacientes nuevos", "Resumen del mes", "¿Qué mejorar?"],
    "/marketing": ["Crear audiencia", "Mejor plantilla", "Ver métricas"],
    default: ["Resumen del día", "Métricas clave", "¿Qué optimizar?"],
  },
  admin: {
    "/dashboard": ["¿Cómo van mis citas?", "Pacientes nuevos", "Resumen del mes", "¿Qué mejorar?"],
    "/marketing": ["Crear audiencia", "Mejor plantilla", "Ver métricas"],
    default: ["Resumen del día", "Métricas clave", "¿Qué optimizar?"],
  },
  manager: {
    "/agenda": ["Citas de hoy", "Horarios disponibles mañana"],
    default: ["Resumen del equipo", "Citas pendientes", "Métricas del día"],
  },
  empleado: { default: ["Mis citas de hoy", "Buscar paciente"] },
  vendedor: { default: ["Leads nuevos hoy", "Sin responder", "Mi pipeline"] },
};

export const useCopilot = () => {
  const { isOpen, setIsOpen, messages, setMessages, isLoading, setIsLoading, clearMessages } = useCopilotContext();
  const { user } = useAuth();
  const { clinicId, clinicName, isSuperAdmin } = useClinic();
  const location = useLocation();
  const [userRole, setUserRole] = useState<AppRole>("empleado");

  // Fetch user role
  useEffect(() => {
    if (!user || !clinicId) return;
    if (isSuperAdmin) { setUserRole("super_admin"); return; }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) setUserRole(data.role as AppRole);
        else setUserRole("empleado");
      });
  }, [user, clinicId, isSuperAdmin]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = WELCOME_MESSAGES[userRole] || WELCOME_MESSAGES.empleado;
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: welcome,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, userRole]);

  const currentPage = location.pathname;
  const pageSubtitle = Object.entries(PAGE_SUBTITLES).find(([path]) => currentPage.startsWith(path))?.[1] || "¿En qué te puedo ayudar?";

  const quickSuggestions = (() => {
    const roleSuggs = QUICK_SUGGESTIONS[userRole] || QUICK_SUGGESTIONS.empleado;
    const pageMatch = Object.entries(roleSuggs).find(([path]) => path !== "default" && currentPage.startsWith(path));
    return pageMatch?.[1] || roleSuggs.default || [];
  })();

  const permissions = ROLE_PERMISSIONS[userRole];
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";

  const sendMessage = useCallback(async (content: string, isVoice = false) => {
    if (!content.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      isVoice,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const recentMsgs = [...messages.filter(m => m.id !== "welcome"), userMsg]
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("copilot-chat", {
        body: {
          messages: recentMsgs,
          user_name: userName,
          user_role: userRole,
          role_label: permissions.label,
          clinic_name: clinicName,
          clinic_id: clinicId,
          current_page: currentPage,
          can_read: permissions.canRead,
          can_write: permissions.canWrite,
          can_delete: permissions.canDelete,
        },
      });

      if (error) throw error;

      const assistantMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.reply || "Lo siento, no pude procesar tu solicitud. Intenta de nuevo.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Copilot error:", err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, userName, userRole, permissions, clinicName, clinicId, currentPage]);

  const handleClear = useCallback(() => {
    clearMessages();
    // Re-add welcome
    const welcome = WELCOME_MESSAGES[userRole] || WELCOME_MESSAGES.empleado;
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: welcome,
      timestamp: new Date(),
    }]);
  }, [userRole, clearMessages, setMessages]);

  return {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    sendMessage,
    clearMessages: handleClear,
    pageSubtitle,
    quickSuggestions,
    userRole,
  };
};
